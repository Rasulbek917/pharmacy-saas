import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { comparePassword, signJwtToken, getAuthCookieName } from "@/lib/auth";
import { loginSchema } from "@/lib/validations";
import { getDaysRemaining } from "@/lib/formatters";
import { logAudit } from "@/lib/audit";
import { checkLoginRateLimit, recordFailedLoginAttempt, resetLoginRateLimit } from "@/lib/rateLimit";
import { AuthUser, PharmacyStatus } from "@/types";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = loginSchema.safeParse(body);

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

    const { username, password } = validated.data;
    const ipAddress = req.headers.get("x-forwarded-for") || req.ip || "127.0.0.1";
    const rateLimitKey = `${ipAddress}_${username}`;

    // 1. Check rate limit
    const rateCheck = checkLoginRateLimit(rateLimitKey);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "TOO_MANY_REQUESTS",
            message: rateCheck.message || "Xavfsizlik yuzasidan hisob vaqtincha bloklandi.",
          },
        },
        { status: 429 }
      );
    }

    // 2. Find user
    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        pharmacy: true,
      },
    });

    if (!user) {
      const failResult = recordFailedLoginAttempt(rateLimitKey);
      await logAudit({
        action: "TIZIMGA_KIRISH_XATOSI",
        entity: "User",
        ipAddress,
        details: `Noma'lum foydalanuvchi orqali kirishga urinish: "${username}"`,
      });

      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_CREDENTIALS",
            message: failResult.message || "Login yoki parol noto‘g‘ri!",
          },
        },
        { status: 401 }
      );
    }

    if (user.status !== "ACTIVE") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "ACCOUNT_INACTIVE",
            message: "Ushbu foydalanuvchi hisobi faol emas yoki bloklangan.",
          },
        },
        { status: 403 }
      );
    }

    // 3. Verify password
    const isPasswordValid = await comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      const failResult = recordFailedLoginAttempt(rateLimitKey);
      await logAudit({
        pharmacyId: user.pharmacyId,
        userId: user.id,
        userName: user.fullName,
        action: "NOTOGRI_PAROL",
        entity: "User",
        entityId: user.id,
        ipAddress,
        details: `Foydalanuvchi "${username}" uchun noto‘g‘ri parol kiritildi. Qolgan urinishlar: ${failResult.remainingAttempts}`,
      });

      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_CREDENTIALS",
            message: failResult.message || "Login yoki parol noto‘g‘ri!",
          },
        },
        { status: 401 }
      );
    }

    // Login succeeded: reset rate limit attempts
    resetLoginRateLimit(rateLimitKey);

    let trialDaysLeft: number | null = null;
    let subscriptionDaysLeft: number | null = null;

    // 4. If user belongs to a pharmacy, check subscription and status
    if (user.pharmacy && user.role !== "SUPER_ADMIN") {
      const pharmacy = user.pharmacy;

      if (pharmacy.status === "DELETED") {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "PHARMACY_DELETED",
              message: "Ushbu dorixona tizimdan o‘chirilgan.",
            },
          },
          { status: 403 }
        );
      }

      const now = new Date();
      let shouldBlock = false;

      // Check trial
      if (pharmacy.status === "TRIAL" && pharmacy.trialEndDate) {
        trialDaysLeft = getDaysRemaining(pharmacy.trialEndDate);
        if (trialDaysLeft <= 0) {
          shouldBlock = true;
        }
      }

      // Check subscription
      if (pharmacy.status === "ACTIVE" && pharmacy.subscriptionEndDate) {
        subscriptionDaysLeft = getDaysRemaining(pharmacy.subscriptionEndDate);
        if (subscriptionDaysLeft <= 0) {
          shouldBlock = true;
        }
      }

      if (shouldBlock && pharmacy.status !== "BLOCKED") {
        await prisma.pharmacy.update({
          where: { id: pharmacy.id },
          data: { status: "BLOCKED" },
        });
        pharmacy.status = "BLOCKED";
      }

      if (pharmacy.status === "BLOCKED") {
        return NextResponse.json(
          {
            success: false,
            isBlocked: true,
            error: {
              code: "SUBSCRIPTION_EXPIRED",
              message: "Obunangiz tugagan. Tizimdan foydalanishni davom ettirish uchun obunani yangilang.",
            },
          },
          { status: 403 }
        );
      }
    }

    const authUser: AuthUser = {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role as any,
      pharmacyId: user.pharmacyId,
      pharmacyName: user.pharmacy?.name || null,
      pharmacyStatus: (user.pharmacy?.status as PharmacyStatus) || null,
      trialDaysLeft,
      subscriptionDaysLeft,
    };

    const token = signJwtToken(authUser);

    // Audit log
    await logAudit({
      pharmacyId: user.pharmacyId,
      userId: user.id,
      userName: user.fullName,
      action: "TIZIMGA_KIRISH",
      entity: "User",
      entityId: user.id,
      ipAddress,
      details: `${user.fullName} (${user.role}) tizimga muvaffaqiyatli kirdi`,
    });

    const response = NextResponse.json({
      success: true,
      message: "Tizimga muvaffaqiyatli kirdingiz",
      user: authUser,
    });

    response.cookies.set({
      name: getAuthCookieName(),
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      sameSite: "lax",
    });

    return response;
  } catch (error: any) {
    logger.error("Login error", { error: error });
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: "Serverda xatolik yuz berdi. Qayta urinib ko‘ring.",
        },
      },
      { status: 500 }
    );
  }
}
