import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, getAuthCookieName } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDaysRemaining } from "@/lib/formatters";
import { PharmacyStatus } from "@/types";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, user: null }, { status: 401 });
    }

    // Refresh dynamic status from database
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { pharmacy: true },
    });

    if (!dbUser || dbUser.status !== "ACTIVE") {
      const response = NextResponse.json({ success: false, user: null }, { status: 401 });
      response.cookies.delete(getAuthCookieName());
      return response;
    }

    let trialDaysLeft: number | null = null;
    let subscriptionDaysLeft: number | null = null;

    if (dbUser.pharmacy) {
      if (dbUser.pharmacy.trialEndDate) {
        trialDaysLeft = getDaysRemaining(dbUser.pharmacy.trialEndDate);
      }
      if (dbUser.pharmacy.subscriptionEndDate) {
        subscriptionDaysLeft = getDaysRemaining(dbUser.pharmacy.subscriptionEndDate);
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        id: dbUser.id,
        username: dbUser.username,
        fullName: dbUser.fullName,
        role: dbUser.role,
        pharmacyId: dbUser.pharmacyId,
        pharmacyName: dbUser.pharmacy?.name || null,
        pharmacyStatus: (dbUser.pharmacy?.status as PharmacyStatus) || null,
        trialDaysLeft,
        subscriptionDaysLeft,
      },
    });
  } catch (error) {
    logger.error("GET /api\auth\me\route.ts xatolik", { error: error, route: "/api\auth\me\route.ts" });
    return NextResponse.json({ success: false, user: null }, { status: 500 });
  }
}
