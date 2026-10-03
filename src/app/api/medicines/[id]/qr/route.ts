import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantContext } from "@/lib/tenant";
import { logAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

// Helper to generate a safe, unique, compact product QR code string
function generateUniqueProductCode(pharmacyId: string, medicineId: string): string {
  // Safe format: MED-<shortPharmacyId>-<shortRandom>-<timestampSuffix>
  const shortId = medicineId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toUpperCase();
  const timeCode = Date.now().toString(36).slice(-4).toUpperCase();
  const randomSuffix = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `MED-${shortId}-${timeCode}${randomSuffix}`;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { context, errorResponse } = await requireTenantContext(req, [
      "SUPER_ADMIN",
      "PHARMACY_ADMIN",
      "WAREHOUSEMAN",
    ]);
    if (errorResponse) return errorResponse;

    const { user, pharmacyId } = context!;
    const body = await req.json().catch(() => ({}));
    const regenerate = Boolean(body.regenerate);

    // 1. Verify medicine belongs to tenant
    const medicine = await prisma.medicine.findFirst({
      where: {
        id: params.id,
        pharmacyId,
      },
      include: {
        category: true,
        manufacturer: true,
      },
    });

    if (!medicine) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Dori vositasi topilmadi" } },
        { status: 404 }
      );
    }

    // 2. If QR code already exists and not regenerating, return existing
    if (medicine.qrCode && !regenerate) {
      return NextResponse.json({
        success: true,
        message: "Mavjud QR kod yuklandi",
        qrCode: medicine.qrCode,
        medicine,
      });
    }

    // 3. Generate unique code
    let newQrCode = "";
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 5) {
      newQrCode = generateUniqueProductCode(pharmacyId, medicine.id);
      const existing = await prisma.medicine.findFirst({
        where: {
          pharmacyId,
          qrCode: newQrCode,
          id: { not: medicine.id },
        },
      });
      if (!existing) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "GENERATION_FAILED", message: "Unikal QR kod yaratib bo‘lmadi. Qayta urinib ko‘ring." },
        },
        { status: 500 }
      );
    }

    // 4. Update medicine with new QR code
    const updated = await prisma.medicine.update({
      where: { id: medicine.id },
      data: { qrCode: newQrCode },
      include: {
        category: true,
        manufacturer: true,
      },
    });

    // 5. Audit log
    await logAudit({
      pharmacyId,
      userId: user.id,
      userName: user.fullName,
      action: regenerate ? "QR_QAYTA_YARATILDI" : "QR_YARATILDI",
      entity: "Medicine",
      entityId: medicine.id,
      details: `${medicine.name} uchun yangi QR kod generatsiya qilindi (${newQrCode})`,
    });

    return NextResponse.json({
      success: true,
      message: regenerate ? "QR kod muvaffaqiyatli yangilandi" : "QR kod muvaffaqiyatli yaratildi",
      qrCode: newQrCode,
      medicine: updated,
    });
  } catch (error) {
    logger.error("Generate QR error", { error: error });
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "QR kod yaratishda xatolik yuz berdi" } },
      { status: 500 }
    );
  }
}
