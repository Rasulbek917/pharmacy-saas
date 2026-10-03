import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantContext } from "@/lib/tenant";
import { medicineSchema } from "@/lib/validations";
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
    const medicine = await prisma.medicine.findFirst({
      where: {
        id: params.id,
        pharmacyId,
      },
      include: {
        category: true,
        manufacturer: true,
        batches: {
          orderBy: { expiryDate: "asc" },
          include: {
            supplier: true,
          },
        },
        transactions: {
          orderBy: { createdAt: "desc" },
          take: 20,
          include: {
            createdBy: {
              select: { fullName: true, role: true },
            },
          },
        },
      },
    });

    if (!medicine) {
      return NextResponse.json({ success: false, error: "Dori vositasi topilmadi" }, { status: 404 });
    }

    const totalStock = medicine.batches.reduce((sum, b) => sum + b.currentQuantity, 0);

    return NextResponse.json({
      success: true,
      data: {
        ...medicine,
        totalStock,
      },
    });
  } catch (error) {
    logger.error("GET /api/medicines/:id xatolik", { error, route: "/api/medicines/:id" });
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
      "WAREHOUSEMAN",
    ]);
    if (errorResponse) return errorResponse;

    const { user, pharmacyId } = context!;
    const body = await req.json();
    const validated = medicineSchema.partial().safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { success: false, error: validated.error.errors[0]?.message || "Xato ma'lumot" },
        { status: 400 }
      );
    }

    const currentMed = await prisma.medicine.findFirst({
      where: { id: params.id, pharmacyId },
    });

    if (!currentMed) {
      return NextResponse.json({ success: false, error: "Dori topilmadi" }, { status: 404 });
    }

    const updated = await prisma.medicine.update({
      where: { id: params.id },
      data: validated.data,
    });

    if (validated.data.salePrice && validated.data.salePrice !== currentMed.salePrice) {
      await logAudit({
        pharmacyId,
        userId: user.id,
        userName: user.fullName,
        action: "NARX_OZGARTIRILDI",
        entity: "Medicine",
        entityId: params.id,
        details: `${currentMed.name} narxi o‘zgartirildi: ${currentMed.salePrice} -> ${validated.data.salePrice} so'm`,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Dori vositasi muvaffaqiyatli tahrirlandi",
      data: updated,
    });
  } catch (error) {
    logger.error("PATCH /api/medicines/:id xatolik", { error, route: "/api/medicines/:id" });
    return NextResponse.json({ success: false, error: "Xatolik yuz berdi" }, { status: 500 });
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

    const medicine = await prisma.medicine.findFirst({
      where: { id: params.id, pharmacyId },
      include: { saleItems: true },
    });

    if (!medicine) {
      return NextResponse.json({ success: false, error: "Dori topilmadi" }, { status: 404 });
    }

    // If medicine has sales, soft delete it
    if (medicine.saleItems.length > 0) {
      await prisma.medicine.update({
        where: { id: params.id },
        data: { status: "INACTIVE" },
      });
    } else {
      await prisma.medicine.delete({
        where: { id: params.id },
      });
    }

    await logAudit({
      pharmacyId,
      userId: user.id,
      userName: user.fullName,
      action: "DORI_OCHIRILDI",
      entity: "Medicine",
      entityId: params.id,
      details: `Dori vositasi o‘chirildi: ${medicine.name}`,
    });

    return NextResponse.json({
      success: true,
      message: "Dori vositasi muvaffaqiyatli o‘chirildi",
    });
  } catch (error) {
    logger.error("DELETE /api/medicines/:id xatolik", { error, route: "/api/medicines/:id" });
    return NextResponse.json({ success: false, error: "Xatolik yuz berdi" }, { status: 500 });
  }
}
