import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantContext } from "@/lib/tenant";
import { hashPassword } from "@/lib/auth";
import { updateStaffSchema } from "@/lib/validations";
import { logAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { context, errorResponse } = await requireTenantContext(req, [
      "SUPER_ADMIN",
      "PHARMACY_ADMIN",
    ]);
    if (errorResponse) return errorResponse;

    const { user, pharmacyId } = context!;
    const body = await req.json();
    const validated = updateStaffSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: validated.error.errors[0]?.message || "Xato ma'lumot",
          },
        },
        { status: 400 }
      );
    }

    const staff = await prisma.user.findFirst({
      where: { id: params.id, pharmacyId },
    });

    if (!staff) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Xodim topilmadi" } },
        { status: 404 }
      );
    }

    const { username, password, ...rest } = validated.data;
    const newUsername = username?.trim();

    // Yangi login boshqa foydalanuvchi tomonidan band qilinmaganini tekshiramiz
    if (newUsername && newUsername !== staff.username) {
      const taken = await prisma.user.findUnique({ where: { username: newUsername } });
      if (taken && taken.id !== staff.id) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "USERNAME_TAKEN",
              message: "Ushbu login allaqachon band. Boshqa login tanlang.",
            },
          },
          { status: 400 }
        );
      }
    }

    const data: {
      fullName?: string;
      phone?: string | null;
      role?: string;
      status?: string;
      username?: string;
      passwordHash?: string;
    } = {};
    if (rest.fullName !== undefined) data.fullName = rest.fullName;
    if (rest.phone !== undefined) data.phone = rest.phone;
    if (rest.role !== undefined) data.role = rest.role;
    if (rest.status !== undefined) data.status = rest.status;
    if (newUsername && newUsername !== staff.username) data.username = newUsername;
    if (password) data.passwordHash = await hashPassword(password);

    if (Object.keys(data).length === 0) {
      const { passwordHash, ...safeStaff } = staff;
      return NextResponse.json({
        success: true,
        message: "O'zgarish kiritilmadi",
        data: safeStaff,
      });
    }

    const updated = await prisma.user.update({
      where: { id: params.id },
      data,
    });

    // Audit (parol qiymati hech qachon loglanmaydi)
    const changedFields: string[] = [];
    if (data.fullName && data.fullName !== staff.fullName) changedFields.push("ismi");
    if (data.username) changedFields.push("logini");
    if (data.passwordHash) changedFields.push("paroli");
    if (data.phone !== undefined && data.phone !== staff.phone) changedFields.push("telefoni");
    if (data.role && data.role !== staff.role) changedFields.push("roli");
    if (data.status && data.status !== staff.status) changedFields.push("holati");

    await logAudit({
      pharmacyId,
      userId: user.id,
      userName: user.fullName,
      action: "XODIM_TAHRIRLANDI",
      entity: "User",
      entityId: params.id,
      details:
        changedFields.length > 0
          ? `Xodim tahrirlandi: ${updated.fullName}. O'zgartirilgan: ${changedFields.join(", ")}`
          : `Xodim ma'lumotlari yangilandi: ${updated.fullName} (Holat: ${updated.status})`,
    });

    const { passwordHash, ...safeUpdated } = updated;
    return NextResponse.json({
      success: true,
      message: "Xodim ma'lumotlari yangilandi",
      data: safeUpdated,
    });
  } catch (error) {
    logger.error("PATCH /api/staff/[id] xatolik", { error: error, route: "/api/staff/[id]" });
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Xatolik yuz berdi" } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { context, errorResponse } = await requireTenantContext(req, [
      "SUPER_ADMIN",
      "PHARMACY_ADMIN",
    ]);
    if (errorResponse) return errorResponse;

    const { user, pharmacyId } = context!;

    const staff = await prisma.user.findFirst({
      where: { id: params.id, pharmacyId },
      include: { sales: true },
    });

    if (!staff) {
      return NextResponse.json({ success: false, error: "Xodim topilmadi" }, { status: 404 });
    }

    // If staff has sales, deactivate instead of delete
    if (staff.sales.length > 0) {
      await prisma.user.update({
        where: { id: params.id },
        data: { status: "INACTIVE" },
      });
    } else {
      await prisma.user.delete({
        where: { id: params.id },
      });
    }

    await logAudit({
      pharmacyId,
      userId: user.id,
      userName: user.fullName,
      action: "XODIM_OCHIRILDI",
      entity: "User",
      entityId: params.id,
      details: `Xodim o‘chirildi yoki nofaol qilindi: ${staff.fullName}`,
    });

    return NextResponse.json({
      success: true,
      message: "Xodim muvaffaqiyatli o‘chirildi",
    });
  } catch (error) {
    logger.error("DELETE /api\staff\:id\route.ts xatolik", { error: error, route: "/api\staff\:id\route.ts" });
    return NextResponse.json({ success: false, error: "Xatolik yuz berdi" }, { status: 500 });
  }
}
