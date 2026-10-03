import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantContext } from "@/lib/tenant";
import { supplierSchema } from "@/lib/validations";
import { logAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { context, errorResponse } = await requireTenantContext(req);
    if (errorResponse) return errorResponse;

    const { pharmacyId } = context!;

    const supplier = await prisma.supplier.findFirst({
      where: { id: params.id, pharmacyId },
      include: {
        batches: {
          include: { medicine: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!supplier) {
      return NextResponse.json({ success: false, error: "Yetkazib beruvchi topilmadi" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: supplier });
  } catch (error) {
    logger.error("GET /api\suppliers\:id\route.ts xatolik", { error: error, route: "/api\suppliers\:id\route.ts" });
    return NextResponse.json({ success: false, error: "Xatolik yuz berdi" }, { status: 500 });
  }
}

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

    // Check if recording a debt payment
    if (body.payDebtAmount && Number(body.payDebtAmount) > 0) {
      const payAmount = Number(body.payDebtAmount);
      const supplier = await prisma.supplier.findFirst({
        where: { id: params.id, pharmacyId },
      });

      if (!supplier) {
        return NextResponse.json({ success: false, error: "Yetkazib beruvchi topilmadi" }, { status: 404 });
      }

      const updated = await prisma.supplier.update({
        where: { id: params.id },
        data: {
          totalPaid: { increment: payAmount },
          debt: { decrement: payAmount },
        },
      });

      await logAudit({
        pharmacyId,
        userId: user.id,
        userName: user.fullName,
        action: "QARZ_TOLANDI",
        entity: "Supplier",
        entityId: params.id,
        details: `${supplier.name} yetkazib beruvchisiga ${payAmount} so'm qarz to‘landi. Qolgan qarz: ${updated.debt} so'm`,
      });

      return NextResponse.json({
        success: true,
        message: "Qarz to‘lovi muvaffaqiyatli saqlandi",
        data: updated,
      });
    }

    const validated = supplierSchema.partial().safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { success: false, error: validated.error.errors[0]?.message || "Xato ma'lumot" },
        { status: 400 }
      );
    }

    const updated = await prisma.supplier.update({
      where: { id: params.id },
      data: validated.data,
    });

    return NextResponse.json({
      success: true,
      message: "Yetkazib beruvchi ma'lumotlari yangilandi",
      data: updated,
    });
  } catch (error) {
    logger.error("PATCH /api\suppliers\:id\route.ts xatolik", { error: error, route: "/api\suppliers\:id\route.ts" });
    return NextResponse.json({ success: false, error: "Xatolik yuz berdi" }, { status: 500 });
  }
}
