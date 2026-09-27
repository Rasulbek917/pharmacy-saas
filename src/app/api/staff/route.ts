import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantContext } from "@/lib/tenant";
import { hashPassword } from "@/lib/auth";
import { staffSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  try {
    const { context, errorResponse } = await requireTenantContext(req, [
      "SUPER_ADMIN",
      "PHARMACY_ADMIN",
    ]);
    if (errorResponse) return errorResponse;

    const { pharmacyId } = context!;

    const staff = await prisma.user.findMany({
      where: {
        pharmacyId,
        role: { in: ["PHARMACY_ADMIN", "WAREHOUSEMAN", "CASHIER"] },
      },
      select: {
        id: true,
        fullName: true,
        username: true,
        role: true,
        phone: true,
        status: true,
        createdAt: true,
        _count: {
          select: { sales: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ success: true, data: staff });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Xatolik yuz berdi" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { context, errorResponse } = await requireTenantContext(req, [
      "SUPER_ADMIN",
      "PHARMACY_ADMIN",
    ]);
    if (errorResponse) return errorResponse;

    const { user, pharmacyId } = context!;
    const body = await req.json();
    const validated = staffSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { success: false, error: validated.error.errors[0]?.message || "Xato ma'lumot" },
        { status: 400 }
      );
    }

    const { fullName, username, password, phone, role } = validated.data;

    const existing = await prisma.user.findUnique({
      where: { username },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "Ushbu login tizimda allaqachon mavjud!" },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);

    const newStaff = await prisma.user.create({
      data: {
        pharmacyId,
        fullName,
        username,
        passwordHash,
        phone: phone || null,
        role,
        status: "ACTIVE",
      },
      select: {
        id: true,
        fullName: true,
        username: true,
        role: true,
        phone: true,
        status: true,
        createdAt: true,
      },
    });

    await logAudit({
      pharmacyId,
      userId: user.id,
      userName: user.fullName,
      action: "XODIM_QOSHILDI",
      entity: "User",
      entityId: newStaff.id,
      details: `Yangi xodim qo‘shildi: ${newStaff.fullName} (${newStaff.role})`,
    });

    return NextResponse.json({
      success: true,
      message: "Xodim muvaffaqiyatli qo‘shildi",
      data: newStaff,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Xatolik yuz berdi" }, { status: 500 });
  }
}
