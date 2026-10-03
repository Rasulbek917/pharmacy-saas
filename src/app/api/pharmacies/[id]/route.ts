import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiAuth } from "@/lib/tenant";
import { hashPassword } from "@/lib/auth";
import { updatePharmacySchema } from "@/lib/validations";
import { logAudit } from "@/lib/audit";
import { getDaysRemaining } from "@/lib/formatters";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, errorResponse } = await requireApiAuth(req, ["SUPER_ADMIN"]);
    if (errorResponse) return errorResponse;

    const pharmacy = await prisma.pharmacy.findUnique({
      where: { id: params.id },
      include: {
        users: {
          select: {
            id: true,
            fullName: true,
            username: true,
            role: true,
            phone: true,
            status: true,
            createdAt: true,
          },
        },
        subscriptions: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
        _count: {
          select: {
            medicines: true,
            sales: true,
            suppliers: true,
          },
        },
      },
    });

    if (!pharmacy) {
      return NextResponse.json({ success: false, error: "Dorixona topilmadi" }, { status: 404 });
    }

    let daysRemaining = 0;
    if (pharmacy.status === "TRIAL" && pharmacy.trialEndDate) {
      daysRemaining = getDaysRemaining(pharmacy.trialEndDate);
    } else if (pharmacy.status === "ACTIVE" && pharmacy.subscriptionEndDate) {
      daysRemaining = getDaysRemaining(pharmacy.subscriptionEndDate);
    }

    return NextResponse.json({
      success: true,
      data: {
        ...pharmacy,
        daysRemaining,
      },
    });
  } catch (error) {
    logger.error("GET /api\pharmacies\:id\route.ts xatolik", { error: error, route: "/api\pharmacies\:id\route.ts" });
    return NextResponse.json({ success: false, error: "Xatolik yuz berdi" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, errorResponse } = await requireApiAuth(req, ["SUPER_ADMIN"]);
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const validated = updatePharmacySchema.safeParse(body);

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

    const currentPharmacy = await prisma.pharmacy.findUnique({
      where: { id: params.id },
    });

    if (!currentPharmacy) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Dorixona topilmadi" } },
        { status: 404 }
      );
    }

    // Admin logini va paroli User jadvida saqlanadi, shuning uchun ularni
    // Pharmacy ustunlaridan ajratib olamiz.
    const { adminUsername, adminPassword, ...pharmacyData } = validated.data;
    const newUsername = adminUsername?.trim();

    const adminUser = await prisma.user.findFirst({
      where: { pharmacyId: params.id, role: "PHARMACY_ADMIN" },
    });

    const usernameChanged =
      !!newUsername && !!adminUser && adminUser.username !== newUsername;
    const passwordChanged = !!adminPassword;

    // Yangi login boshqa foydalanuvchi tomonidan band qilinmaganini tekshiramiz
    if (newUsername && adminUser && adminUser.username !== newUsername) {
      const taken = await prisma.user.findUnique({ where: { username: newUsername } });
      if (taken && taken.id !== adminUser.id) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "USERNAME_TAKEN",
              message: "Ushbu admin logini allaqachon band. Boshqa login tanlang.",
            },
          },
          { status: 400 }
        );
      }
    }

    const hasPharmacyFields = Object.keys(pharmacyData).length > 0;

    const result = await prisma.$transaction(async (tx) => {
      let updatedPharmacy = currentPharmacy;
      if (hasPharmacyFields) {
        updatedPharmacy = await tx.pharmacy.update({
          where: { id: params.id },
          data: pharmacyData,
        });
      }

      if (adminUser) {
        const userData: { username?: string; fullName?: string; passwordHash?: string } = {};
        if (newUsername && adminUser.username !== newUsername) userData.username = newUsername;
        if (pharmacyData.adminName) userData.fullName = pharmacyData.adminName;
        if (adminPassword) userData.passwordHash = await hashPassword(adminPassword);
        if (Object.keys(userData).length > 0) {
          await tx.user.update({ where: { id: adminUser.id }, data: userData });
        }
      }

      return updatedPharmacy;
    });

    // Holat o'zgarganini audit qilish
    if (validated.data.status && validated.data.status !== currentPharmacy.status) {
      const action =
        validated.data.status === "BLOCKED"
          ? "DORIXONA_BLOKLANDI"
          : validated.data.status === "ACTIVE"
          ? "DORIXONA_OCHILDI"
          : "DORIXONA_HOLATI_OZGARDI";

      await logAudit({
        pharmacyId: params.id,
        userId: user.id,
        userName: user.fullName,
        action,
        entity: "Pharmacy",
        entityId: params.id,
        details: `Dorixona holati o'zgartirildi: ${currentPharmacy.status} -> ${validated.data.status}`,
      });
    }

    // Tahrirlashni audit qilish (parol qiymati hech qachon loglanmaydi)
    const changedFields: string[] = [];
    if (validated.data.name && validated.data.name !== currentPharmacy.name) changedFields.push("nomi");
    if (validated.data.phone && validated.data.phone !== currentPharmacy.phone) changedFields.push("telefoni");
    if (validated.data.address && validated.data.address !== currentPharmacy.address) changedFields.push("manzili");
    if (validated.data.adminName && validated.data.adminName !== currentPharmacy.adminName) changedFields.push("admin ismi");
    if (usernameChanged) changedFields.push("admin logini");
    if (passwordChanged) changedFields.push("admin paroli");

    if (changedFields.length > 0) {
      await logAudit({
        pharmacyId: params.id,
        userId: user.id,
        userName: user.fullName,
        action: "DORIXONA_TAHRIRLANDI",
        entity: "Pharmacy",
        entityId: params.id,
        details: `"${currentPharmacy.name}" dorixonasi tahrirlandi. O'zgartirilgan: ${changedFields.join(", ")}`,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Dorixona ma'lumotlari muvaffaqiyatli yangilandi",
      data: result,
    });
  } catch (error) {
    logger.error("PATCH /api/pharmacies/[id] xatolik", { error: error, route: "/api/pharmacies/[id]" });
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
    const { user, errorResponse } = await requireApiAuth(req, ["SUPER_ADMIN"]);
    if (errorResponse) return errorResponse;

    const pharmacy = await prisma.pharmacy.update({
      where: { id: params.id },
      data: { status: "DELETED" },
    });

    await logAudit({
      userId: user.id,
      userName: user.fullName,
      action: "DORIXONA_OCHIRILDI",
      entity: "Pharmacy",
      entityId: params.id,
      details: `Dorixona soft-delete qilindi: ${pharmacy.name}`,
    });

    return NextResponse.json({
      success: true,
      message: "Dorixona muvaffaqiyatli o‘chirildi",
    });
  } catch (error) {
    logger.error("DELETE /api\pharmacies\:id\route.ts xatolik", { error: error, route: "/api\pharmacies\:id\route.ts" });
    return NextResponse.json({ success: false, error: "Xatolik yuz berdi" }, { status: 500 });
  }
}
