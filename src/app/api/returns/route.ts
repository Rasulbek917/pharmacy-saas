import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantContext } from "@/lib/tenant";
import { returnSchema } from "@/lib/validations";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { context, errorResponse } = await requireTenantContext(req);
    if (errorResponse) return errorResponse;

    const { pharmacyId } = context!;

    const returns = await prisma.return.findMany({
      where: { pharmacyId },
      include: {
        returnedBy: {
          select: { fullName: true, username: true },
        },
        items: {
          include: {
            medicine: true,
            batch: true,
          },
        },
        sale: {
          select: { receiptNumber: true, paymentMethod: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: returns });
  } catch (error: any) {
    console.error("Returns GET error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Qaytarishlarni yuklashda xatolik yuz berdi" } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { context, errorResponse } = await requireTenantContext(req, [
      "SUPER_ADMIN",
      "PHARMACY_ADMIN",
      "CASHIER",
    ]);
    if (errorResponse) return errorResponse;

    const { user, pharmacyId } = context!;
    const body = await req.json();
    const validated = returnSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: validated.error.errors[0]?.message || "Xato ma'lumotlar",
          },
        },
        { status: 400 }
      );
    }

    const { saleId, reason, items } = validated.data;

    // Find original sale
    const sale = await prisma.sale.findFirst({
      where: { id: saleId, pharmacyId },
      include: {
        items: true,
        customer: true,
      },
    });

    if (!sale) {
      return NextResponse.json(
        { success: false, error: { code: "SALE_NOT_FOUND", message: "Asl sotuv topilmadi" } },
        { status: 404 }
      );
    }

    // Atomic return transaction
    const result = await prisma.$transaction(async (tx) => {
      let totalRefundAmount = 0;

      for (const item of items) {
        const saleItem = sale.items.find((si) => si.id === item.saleItemId);
        if (!saleItem) {
          throw new Error("Sotuv qatori topilmadi");
        }

        // Check already returned quantities for this saleItem
        const previousReturnItems = await tx.returnItem.findMany({
          where: { saleItemId: item.saleItemId },
        });
        const alreadyReturnedQty = previousReturnItems.reduce((acc, r) => acc + r.quantity, 0);

        if (alreadyReturnedQty + item.quantity > saleItem.quantity) {
          throw new Error(
            `Ushbu mahsulotdan allaqachon ${alreadyReturnedQty} ta qaytarilgan. Maksimal qaytarish mumkin: ${saleItem.quantity - alreadyReturnedQty} ta.`
          );
        }

        totalRefundAmount += Math.round(item.refundUnitPrice * item.quantity);
      }

      // Create return record
      const returnRecord = await tx.return.create({
        data: {
          pharmacyId,
          saleId: sale.id,
          receiptNumber: sale.receiptNumber,
          returnedById: user.id,
          totalRefundAmount,
          reason: reason || "Mijoz xohishi bilan qaytarildi",
        },
      });

      // Restore batches and create return items
      for (const item of items) {
        const itemRefund = Math.round(item.refundUnitPrice * item.quantity);

        await tx.returnItem.create({
          data: {
            returnId: returnRecord.id,
            saleItemId: item.saleItemId,
            medicineId: item.medicineId,
            batchId: item.batchId,
            quantity: item.quantity,
            refundUnitPrice: Math.round(item.refundUnitPrice),
            totalRefund: itemRefund,
          },
        });

        // Increment batch currentQuantity
        await tx.productBatch.update({
          where: { id: item.batchId },
          data: {
            currentQuantity: { increment: item.quantity },
          },
        });

        // Log inventory return transaction
        await tx.inventoryTransaction.create({
          data: {
            pharmacyId,
            medicineId: item.medicineId,
            batchId: item.batchId,
            type: "OUTFLOW_RETURN",
            quantity: item.quantity,
            unitPrice: item.refundUnitPrice,
            createdById: user.id,
            notes: `Qaytarish: Chek #${sale.receiptNumber}, Sabab: ${reason || "Qaytarildi"}`,
          },
        });
      }

      // Decrement customer totalSpent if applicable
      if (sale.customerId) {
        await tx.customer.update({
          where: { id: sale.customerId },
          data: {
            totalSpent: { decrement: totalRefundAmount },
          },
        });
      }

      return returnRecord;
    });

    await logAudit({
      pharmacyId,
      userId: user.id,
      userName: user.fullName,
      action: "QAYTARISH_QILINDI",
      entity: "Return",
      entityId: result.id,
      details: `Chek #${sale.receiptNumber} bo‘yicha ${result.totalRefundAmount} so'm mahsulot omborga qaytarildi`,
    });

    return NextResponse.json({
      success: true,
      message: `Mahsulot muvaffaqiyatli qaytarildi va ombor qoldig‘i tiklandi (${result.totalRefundAmount.toLocaleString("uz-UZ")} so'm)`,
      data: result,
    });
  } catch (error: any) {
    console.error("Return error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "RETURN_ERROR",
          message: error.message || "Qaytarishda xatolik yuz berdi",
        },
      },
      { status: 400 }
    );
  }
}
