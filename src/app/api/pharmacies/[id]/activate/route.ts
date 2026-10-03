import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiAuth } from "@/lib/tenant";
import { logAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, errorResponse } = await requireApiAuth(req, ["SUPER_ADMIN"]);
    if (errorResponse) return errorResponse;

    const body = await req.json().catch(() => ({}));
    const durationDays = Number(body.durationDays) || 30;
    const planName = body.planName || `Oylik obuna (${durationDays} kun)`;
    const price = Number(body.price) || 0;
    const notes = body.notes || "Super Admin tomonidan faollashtirildi";

    const pharmacy = await prisma.pharmacy.findUnique({
      where: { id: params.id },
    });

    if (!pharmacy) {
      return NextResponse.json({ success: false, error: "Dorixona topilmadi" }, { status: 404 });
    }

    const now = new Date();
    // If pharmacy already has an active subscription that hasn't expired yet, extend from existing end date, otherwise from now
    let startDate = now;
    if (pharmacy.subscriptionEndDate && new Date(pharmacy.subscriptionEndDate) > now) {
      startDate = new Date(pharmacy.subscriptionEndDate);
    }

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + durationDays);

    const result = await prisma.$transaction(async (tx) => {
      // Create subscription record
      const subscription = await tx.subscription.create({
        data: {
          pharmacyId: pharmacy.id,
          planName,
          durationDays,
          startDate,
          endDate,
          price,
          status: "ACTIVE",
          activatedBy: user.username,
          notes,
        },
      });

      // Update pharmacy status to ACTIVE and update dates
      const updatedPharmacy = await tx.pharmacy.update({
        where: { id: pharmacy.id },
        data: {
          status: "ACTIVE",
          subscriptionType: "MONTHLY",
          subscriptionStartDate: startDate,
          subscriptionEndDate: endDate,
        },
      });

      // Send in-system notification to the pharmacy
      await tx.notification.create({
        data: {
          pharmacyId: pharmacy.id,
          title: "Obuna faollashtirildi!",
          message: `Tabriklaymiz! Sizning dorixonangiz uchun ${durationDays} kunlik obuna muvaffaqiyatli faollashtirildi. Amal qilish muddati: ${endDate.toLocaleDateString("uz-UZ")}`,
          type: "SYSTEM",
        },
      });

      return { subscription, updatedPharmacy };
    });

    await logAudit({
      userId: user.id,
      userName: user.fullName,
      action: "OBUNA_FAOLLASHTIRILDI",
      entity: "Subscription",
      entityId: result.subscription.id,
      details: `${pharmacy.name} dorixonasi uchun ${durationDays} kunlik obuna faollashtirildi (tugash sanasi: ${endDate.toLocaleDateString("uz-UZ")})`,
    });

    return NextResponse.json({
      success: true,
      message: `Obuna muvaffaqiyatli faollashtirildi! Dorixona holati: Aktiv. Tugash sanasi: ${endDate.toLocaleDateString("uz-UZ")}`,
      data: result.updatedPharmacy,
    });
  } catch (error: any) {
    logger.error("Activate subscription error", { error: error });
    return NextResponse.json({ success: false, error: "Xatolik yuz berdi" }, { status: 500 });
  }
}
