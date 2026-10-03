import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, comparePassword, hashPassword } from "@/lib/auth";
import { changePasswordSchema } from "@/lib/validations";
import { logAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Avval tizimga kiring" } },
        { status: 401 }
      );
    }

    const body = await req.json();
    const validated = changePasswordSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: validated.error.errors[0]?.message || "Ma'lumotlar noto‘g‘ri kiritildi",
          },
        },
        { status: 400 }
      );
    }

    const { currentPassword, newPassword } = validated.data;

    const user = await prisma.user.findUnique({ where: { id: currentUser.id } });
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Foydalanuvchi topilmadi" } },
        { status: 404 }
      );
    }

    const isValid = await comparePassword(currentPassword, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_PASSWORD", message: "Joriy parol noto‘g‘ri" } },
        { status: 401 }
      );
    }

    if (currentPassword === newPassword) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "SAME_PASSWORD", message: "Yangi parol joriy paroldan farq qilishi kerak" },
        },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    await logAudit({
      pharmacyId: user.pharmacyId,
      userId: user.id,
      userName: user.fullName,
      action: "PAROL_OZGARTIRILDI",
      entity: "User",
      entityId: user.id,
      details: `${user.fullName} (${user.role}) o‘z parolini almashtirdi`,
    });

    return NextResponse.json({
      success: true,
      message: "Parol muvaffaqiyatli almashtirildi",
    });
  } catch (error) {
    // Parollar hech qachon log qilinmaydi — faqat xato obyekti
    logger.error("POST /api/auth/change-password xatolik", { error, route: "/api/auth/change-password" });
    return NextResponse.json(
      {
        success: false,
        error: { code: "SERVER_ERROR", message: "Parolni almashtirishda xatolik yuz berdi" },
      },
      { status: 500 }
    );
  }
}
