import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantContext } from "@/lib/tenant";
import { inflowSchema } from "@/lib/validations";
import { getExpiryStatus } from "@/lib/formatters";

export const dynamic = "force-dynamic";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  try {
    const { context, errorResponse } = await requireTenantContext(req, [
      "SUPER_ADMIN",
      "PHARMACY_ADMIN",
      "WAREHOUSEMAN",
    ]);
    if (errorResponse) return errorResponse;

    const { user, pharmacyId } = context!;
    const body = await req.json();
    const validated = inflowSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { success: false, error: validated.error.errors[0]?.message || "Xato ma'lumot" },
        { status: 400 }
      );
    }

    const { medicineId, batchNumber, quantity, purchasePrice, salePrice, expiryDate, supplierId } =
      validated.data;

    // Verify medicine belongs to tenant
    const medicine = await prisma.medicine.findFirst({
      where: { id: medicineId, pharmacyId },
    });

    if (!medicine) {
      return NextResponse.json(
        { success: false, error: "Tanlangan dori vositasi topilmadi" },
        { status: 404 }
      );
    }

    const expDate = new Date(expiryDate);
    const { status: expiryStatus } = getExpiryStatus(expDate);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create product batch
      const batch = await tx.productBatch.create({
        data: {
          pharmacyId,
          medicineId,
          batchNumber,
          initialQuantity: quantity,
          currentQuantity: quantity,
          purchasePrice,
          salePrice,
          expiryDate: expDate,
          supplierId: supplierId || null,
          status: expiryStatus,
        },
      });

      // 2. Create inventory transaction record
      await tx.inventoryTransaction.create({
        data: {
          pharmacyId,
          medicineId,
          batchId: batch.id,
          type: "INFLOW",
          quantity,
          unitPrice: purchasePrice,
          createdById: user.id,
          notes: `Kirim: Partiya #${batchNumber}, Yaroqlilik: ${expDate.toLocaleDateString("uz-UZ")}`,
        },
      });

      // 3. Update medicine sale price if higher/updated
      if (salePrice > 0) {
        await tx.medicine.update({
          where: { id: medicineId },
          data: { salePrice },
        });
      }

      // 4. Update supplier debt if supplier provided
      if (supplierId) {
        const totalPurchaseCost = purchasePrice * quantity;
        await tx.supplier.update({
          where: { id: supplierId },
          data: {
            totalPurchases: { increment: totalPurchaseCost },
            debt: { increment: totalPurchaseCost },
          },
        });
      }

      return batch;
    });

    await logAudit({
      pharmacyId,
      userId: user.id,
      userName: user.fullName,
      action: "OMBORGA_KIRIM",
      entity: "ProductBatch",
      entityId: result.id,
      details: `${medicine.name} dori vositasidan ${quantity} ${medicine.unit} kirim qilindi (Partiya #${batchNumber})`,
    });

    return NextResponse.json({
      success: true,
      message: `Mahsulot muvaffaqiyatli omborga qo‘shildi: ${medicine.name} (+${quantity} ${medicine.unit})`,
      data: result,
    });
  } catch (error: any) {
    console.error("Inflow error:", error);
    return NextResponse.json(
      { success: false, error: "Omborga kirim qilishda xatolik yuz berdi" },
      { status: 500 }
    );
  }
}
