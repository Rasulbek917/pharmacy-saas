import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantContext } from "@/lib/tenant";
import { saleSchema } from "@/lib/validations";
import { logAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

async function generateReceiptNumber(pharmacyId: string): Promise<string> {
  const d = new Date();
  const dateStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const prefix = `CHK-${dateStr}-`;

  const lastSale = await prisma.sale.findFirst({
    where: { pharmacyId, receiptNumber: { startsWith: prefix } },
    orderBy: { receiptNumber: "desc" },
    select: { receiptNumber: true },
  });

  let seq = 1;
  if (lastSale) {
    const lastSeq = parseInt(lastSale.receiptNumber.replace(prefix, ""), 10);
    if (!isNaN(lastSeq)) seq = lastSeq + 1;
  }

  return `${prefix}${String(seq).padStart(4, '0')}`;
}

export async function GET(req: NextRequest) {
  try {
    const { context, errorResponse } = await requireTenantContext(req);
    if (errorResponse) return errorResponse;

    const { user, pharmacyId } = context!;
    const cashierId = req.nextUrl.searchParams.get("cashierId");
    const startDate = req.nextUrl.searchParams.get("startDate");
    const endDate = req.nextUrl.searchParams.get("endDate");

    const where: any = {
      pharmacyId,
    };

    // If role is CASHIER, cashier only views their own sales
    if (user.role === "CASHIER") {
      where.cashierId = user.id;
    } else if (cashierId) {
      where.cashierId = cashierId;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const sales = await prisma.sale.findMany({
      where,
      include: {
        cashier: {
          select: { id: true, fullName: true, username: true },
        },
        customer: {
          select: { id: true, name: true, phone: true },
        },
        items: {
          include: {
            medicine: true,
            batch: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ success: true, data: sales });
  } catch (error: any) {
    logger.error("Sales GET error", { error: error });
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Savdolarni yuklashda xatolik yuz berdi" } },
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
    const validated = saleSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: validated.error.errors[0]?.message || "Xato sotuv ma'lumotlari",
          },
        },
        { status: 400 }
      );
    }

    const { customerId, paymentMethod, discountAmount, paidAmount, items, notes, idempotencyKey } = validated.data;

    // 1. Idempotency Check: Prevent duplicate sales
    if (idempotencyKey) {
      const existingSale = await prisma.sale.findFirst({
        where: {
          pharmacyId,
          idempotencyKey,
        },
        include: {
          items: {
            include: { medicine: true },
          },
          pharmacy: true,
          cashier: true,
        },
      });

      if (existingSale) {
        return NextResponse.json({
          success: true,
          message: "Ushbu savdo allaqachon muvaffaqiyatli saqlangan (Idempotent takrorlanish)",
          data: {
            ...existingSale,
            pharmacyName: existingSale.pharmacy.name,
            pharmacyPhone: existingSale.pharmacy.phone,
            pharmacyAddress: existingSale.pharmacy.address,
            cashierName: existingSale.cashier.fullName,
            items: existingSale.items.map((i) => ({
              medicineId: i.medicineId,
              batchId: i.batchId,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              discount: i.discount,
              totalPrice: i.totalPrice,
              medicineName: i.medicine.name,
            })),
          },
        });
      }
    }

    // Fetch pharmacy details for receipt
    const pharmacy = await prisma.pharmacy.findUnique({
      where: { id: pharmacyId },
    });

    if (!pharmacy) {
      return NextResponse.json(
        { success: false, error: { code: "PHARMACY_NOT_FOUND", message: "Dorixona topilmadi" } },
        { status: 404 }
      );
    }

    const now = new Date();
    const receiptNumber = await generateReceiptNumber(pharmacyId);

    // Run atomic transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Validate batches, expiry, and calculate total gross
      let totalAmount = 0;
      const validatedItems: Array<{
        medicineId: string;
        batchId: string;
        batchNumber: string;
        quantity: number;
        unitPrice: number;
        discount: number;
        totalPrice: number;
        purchasePrice: number;
        medicineName: string;
      }> = [];

      for (const item of items) {
        const batch = await tx.productBatch.findFirst({
          where: {
            id: item.batchId,
            pharmacyId,
          },
          include: {
            medicine: true,
          },
        });

        if (!batch) {
          throw new Error(`Partiya topilmadi yoki ushbu dorixonaga tegishli emas`);
        }

        // Check if expired
        if (new Date(batch.expiryDate) < now) {
          throw new Error(
            `"${batch.medicine.name}" (Partiya #${batch.batchNumber}) ning yaroqlilik muddati tugagan (${new Date(batch.expiryDate).toLocaleDateString("uz-UZ")})! Muddati tugagan dorini sotish qat'iyan taqiqlangan.`
          );
        }

        // Check stock availability
        if (batch.currentQuantity < item.quantity) {
          throw new Error(
            `"${batch.medicine.name}" partiyasida qoldiq yetarli emas! Mavjud: ${batch.currentQuantity} ta, so‘ralgan: ${item.quantity} ta.`
          );
        }

        const itemTotal = Math.round(item.unitPrice * item.quantity - item.discount);
        totalAmount += Math.round(item.unitPrice * item.quantity);

        validatedItems.push({
          medicineId: batch.medicineId,
          batchId: batch.id,
          batchNumber: batch.batchNumber,
          quantity: item.quantity,
          unitPrice: Math.round(item.unitPrice),
          discount: Math.round(item.discount),
          totalPrice: itemTotal,
          purchasePrice: batch.purchasePrice,
          medicineName: batch.medicine.name,
        });
      }

      // 2. Validate discount
      if (discountAmount > totalAmount) {
        throw new Error("Chegirma summasi savatdagi umumiy qiymatdan oshishi mumkin emas!");
      }

      // Cashier role max discount restriction (max 15%)
      if (user.role === "CASHIER" && totalAmount > 0) {
        const discountPct = (discountAmount / totalAmount) * 100;
        if (discountPct > 15) {
          throw new Error(
            `Kassir uchun ruxsat etilgan maksimal chegirma 15%. Kiritilgan: ${discountPct.toFixed(1)}%. Chegirmali sotish uchun administrator ruxsati kerak.`
          );
        }
      }

      // Tax calculation based on pharmacy settings
      const pharmacyTaxRate = pharmacy.taxRate || 0;
      const taxIncluded = pharmacy.taxIncluded || false;
      let taxAmount = 0;
      let payableAmount = 0;

      if (pharmacyTaxRate > 0) {
        if (taxIncluded) {
          payableAmount = Math.max(0, Math.round(totalAmount - discountAmount));
          taxAmount = Math.round(payableAmount - payableAmount / (1 + pharmacyTaxRate / 100));
        } else {
          const afterDiscount = Math.max(0, totalAmount - discountAmount);
          taxAmount = Math.round(afterDiscount * (pharmacyTaxRate / 100));
          payableAmount = Math.round(afterDiscount + taxAmount);
        }
      } else {
        payableAmount = Math.max(0, Math.round(totalAmount - discountAmount));
      }

      // 3. Strict Payment Validation (paid amount cannot be less than total)
      if (paidAmount < payableAmount) {
        throw new Error(
          `To’langan summa (${Math.round(paidAmount).toLocaleString("uz-UZ")} so’m) to’lov summasidan (${payableAmount.toLocaleString("uz-UZ")} so’m) kam bo’lishi mumkin emas!`
        );
      }

      const changeAmount = Math.max(0, Math.round(paidAmount - payableAmount));

      // 4. Create Sale Record
      const sale = await tx.sale.create({
        data: {
          pharmacyId,
          receiptNumber,
          idempotencyKey: idempotencyKey || null,
          cashierId: user.id,
          customerId: customerId || null,
          totalAmount,
          discountAmount: Math.round(discountAmount),
          taxRate: pharmacyTaxRate,
          taxAmount,
          payableAmount,
          paidAmount: Math.round(paidAmount),
          changeAmount,
          paymentMethod,
          status: "COMPLETED",
          notes: notes || null,
        },
      });

      // 5. Atomic Stock Decrement & Transaction Log
      for (const item of validatedItems) {
        await tx.saleItem.create({
          data: {
            saleId: sale.id,
            medicineId: item.medicineId,
            batchId: item.batchId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount,
            totalPrice: item.totalPrice,
            purchasePrice: item.purchasePrice,
          },
        });

        // ATOMIC stock decrement with conditional check to eliminate race conditions
        const updateResult = await tx.productBatch.updateMany({
          where: {
            id: item.batchId,
            pharmacyId,
            currentQuantity: { gte: item.quantity },
          },
          data: {
            currentQuantity: { decrement: item.quantity },
          },
        });

        if (updateResult.count === 0) {
          throw new Error(
            `"${item.medicineName}" (Partiya #${item.batchNumber}) omborda yetarli emas yoki ayni vaqtda boshqa kassir tomonidan sotildi! Savdo bekor qilindi.`
          );
        }

        // Create outflow audit transaction
        await tx.inventoryTransaction.create({
          data: {
            pharmacyId,
            medicineId: item.medicineId,
            batchId: item.batchId,
            type: "OUTFLOW_SALE",
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            createdById: user.id,
            notes: `Sotuv: Chek #${receiptNumber}`,
          },
        });

        // Check if medicine remaining total stock is below minStock
        const allBatches = await tx.productBatch.findMany({
          where: { medicineId: item.medicineId, pharmacyId },
        });
        const currentTotalStock = allBatches.reduce((acc, b) => acc + b.currentQuantity, 0);

        const medicine = await tx.medicine.findUnique({
          where: { id: item.medicineId },
        });

        if (medicine && currentTotalStock <= medicine.minStock) {
          const refKey = `LOW_STOCK_${item.medicineId}`;
          await tx.notification.upsert({
            where: {
              pharmacyId_type_referenceKey: { pharmacyId, type: "LOW_STOCK", referenceKey: refKey },
            },
            update: {
              message: `Diqqat: "${medicine.name}" dorisining umumiy qoldig'i ${currentTotalStock} ${medicine.unit} qoldi (minimal chegara: ${medicine.minStock}).`,
            },
            create: {
              pharmacyId,
              title: "Qoldiq kamaydi!",
              message: `Diqqat: "${medicine.name}" dorisining umumiy qoldig'i ${currentTotalStock} ${medicine.unit} qoldi (minimal chegara: ${medicine.minStock}).`,
              type: "LOW_STOCK",
              referenceKey: refKey,
            },
          });
        }
      }

      // 6. Create Payment record
      await tx.payment.create({
        data: {
          pharmacyId,
          saleId: sale.id,
          amount: payableAmount,
          paymentMethod,
          status: "SUCCESS",
        },
      });

      // 7. Update customer statistics
      if (customerId) {
        await tx.customer.update({
          where: { id: customerId },
          data: {
            totalSpent: { increment: payableAmount },
            purchasesCount: { increment: 1 },
          },
        });
      }

      return {
        sale,
        pharmacy,
        items: validatedItems,
      };
    });

    await logAudit({
      pharmacyId,
      userId: user.id,
      userName: user.fullName,
      action: "SOTUV_QILINDI",
      entity: "Sale",
      entityId: result.sale.id,
      details: `Chek #${receiptNumber}: ${result.sale.payableAmount} so'm (${result.sale.paymentMethod})`,
    });

    return NextResponse.json({
      success: true,
      message: "Sotuv muvaffaqiyatli yakunlandi",
      data: {
        ...result.sale,
        pharmacyName: pharmacy.name,
        pharmacyPhone: pharmacy.phone,
        pharmacyAddress: pharmacy.address,
        cashierName: user.fullName,
        items: result.items,
      },
    });
  } catch (error: any) {
    logger.error("Sale POST error", { error: error });
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SALE_EXECUTION_ERROR",
          message: error.message || "Sotuvni yakunlashda xatolik yuz berdi",
        },
      },
      { status: 400 }
    );
  }
}
