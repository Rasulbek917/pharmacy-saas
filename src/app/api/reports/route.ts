import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantContext } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { context, errorResponse } = await requireTenantContext(req);
    if (errorResponse) return errorResponse;

    const { user, pharmacyId } = context!;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

    const baseWhere: any = { pharmacyId };
    if (user.role === "CASHIER") {
      baseWhere.cashierId = user.id;
    }

    // 1. Today's sales
    const todaySales = await prisma.sale.findMany({
      where: {
        ...baseWhere,
        createdAt: { gte: todayStart, lte: todayEnd },
        status: "COMPLETED",
      },
      include: { items: true },
    });

    const todayTotalRevenue = todaySales.reduce((acc, s) => acc + s.payableAmount, 0);
    const todaySalesCount = todaySales.length;
    const todayDiscountTotal = todaySales.reduce((acc, s) => acc + s.discountAmount, 0);
    const todayTaxTotal = todaySales.reduce((acc, s) => acc + (s.taxAmount || 0), 0);

    let todayProfit = 0;
    for (const sale of todaySales) {
      for (const item of sale.items) {
        todayProfit += (item.unitPrice - item.purchasePrice) * item.quantity;
      }
      todayProfit -= sale.discountAmount;
      todayProfit -= sale.taxAmount || 0;
    }

    // 2. Month sales
    const monthSales = await prisma.sale.findMany({
      where: {
        ...baseWhere,
        createdAt: { gte: monthStart },
        status: "COMPLETED",
      },
      include: { items: true },
    });

    const monthTotalRevenue = monthSales.reduce((acc, s) => acc + s.payableAmount, 0);
    const monthSalesCount = monthSales.length;
    const monthTaxTotal = monthSales.reduce((acc, s) => acc + (s.taxAmount || 0), 0);

    let monthProfit = 0;
    for (const sale of monthSales) {
      for (const item of sale.items) {
        monthProfit += (item.unitPrice - item.purchasePrice) * item.quantity;
      }
      monthProfit -= sale.discountAmount;
      monthProfit -= sale.taxAmount || 0;
    }

    // 3. Top selling medicines & Full Analytics Table
    const saleItems = await prisma.saleItem.findMany({
      where: {
        sale: {
          pharmacyId,
          createdAt: { gte: monthStart },
          status: "COMPLETED",
        },
      },
      include: { 
        medicine: {
          include: {
            category: true,
            batches: {
              where: { currentQuantity: { gt: 0 } },
            },
          },
        },
      },
    });

    const medicineSalesMap: Record<
      string,
      {
        id: string;
        name: string;
        categoryName: string;
        barcode: string;
        unit: string;
        totalQuantity: number;
        totalRevenue: number;
        totalProfit: number;
        currentStock: number;
        salePrice: number;
      }
    > = {};

    for (const si of saleItems) {
      if (!medicineSalesMap[si.medicineId]) {
        const currentStock = si.medicine.batches.reduce((sum, b) => sum + b.currentQuantity, 0);
        medicineSalesMap[si.medicineId] = {
          id: si.medicineId,
          name: si.medicine.name,
          categoryName: si.medicine.category?.name || "Kategoriyasiz",
          barcode: si.medicine.barcode || "-",
          unit: si.medicine.unit,
          totalQuantity: 0,
          totalRevenue: 0,
          totalProfit: 0,
          currentStock,
          salePrice: si.medicine.salePrice,
        };
      }
      medicineSalesMap[si.medicineId].totalQuantity += si.quantity;
      medicineSalesMap[si.medicineId].totalRevenue += si.totalPrice;
      medicineSalesMap[si.medicineId].totalProfit += (si.unitPrice - si.purchasePrice) * si.quantity;
    }

    const analyticsTable = Object.values(medicineSalesMap).sort(
      (a, b) => b.totalRevenue - a.totalRevenue
    );

    const topMedicines = analyticsTable.slice(0, 10);

    // 4. Cashier performance (if admin or superadmin)
    let cashiersStats: any[] = [];
    if (user.role !== "CASHIER") {
      const cashierSales = await prisma.sale.groupBy({
        by: ["cashierId"],
        where: {
          pharmacyId,
          status: "COMPLETED",
          createdAt: { gte: monthStart },
        },
        _count: { id: true },
        _sum: { payableAmount: true },
      });

      const cashierIds = cashierSales.map((cs) => cs.cashierId);
      const cashiers = await prisma.user.findMany({
        where: { id: { in: cashierIds } },
        select: { id: true, fullName: true, username: true },
      });

      const cashierItemsCount = await prisma.saleItem.groupBy({
        by: ["saleId"],
        where: {
          sale: {
            pharmacyId,
            status: "COMPLETED",
            createdAt: { gte: monthStart },
          },
        },
        _sum: { quantity: true },
      });

      const saleToCashier = await prisma.sale.findMany({
        where: { pharmacyId, status: "COMPLETED", createdAt: { gte: monthStart } },
        select: { id: true, cashierId: true },
      });

      const itemsByCashier: Record<string, number> = {};
      const saleMap = Object.fromEntries(saleToCashier.map((s) => [s.id, s.cashierId]));
      for (const ci of cashierItemsCount) {
        const cId = saleMap[ci.saleId];
        if (cId) {
          itemsByCashier[cId] = (itemsByCashier[cId] || 0) + (ci._sum.quantity || 0);
        }
      }

      for (const c of cashiers) {
        const cs = cashierSales.find((s) => s.cashierId === c.id);
        cashiersStats.push({
          cashierId: c.id,
          fullName: c.fullName,
          username: c.username,
          salesCount: cs?._count.id || 0,
          totalRevenue: cs?._sum.payableAmount || 0,
          totalItemsSold: itemsByCashier[c.id] || 0,
        });
      }
    }

    // 5. Inventory health metrics
    const allMedicines = await prisma.medicine.findMany({
      where: { pharmacyId, status: "ACTIVE" },
      include: {
        batches: {
          where: { currentQuantity: { gt: 0 } },
        },
      },
    });

    let totalMedicinesCount = allMedicines.length;
    let lowStockCount = 0;
    const lowStockMedicines: any[] = [];

    for (const m of allMedicines) {
      const stock = m.batches.reduce((sum, b) => sum + b.currentQuantity, 0);
      if (stock <= m.minStock) {
        lowStockCount++;
        lowStockMedicines.push({
          id: m.id,
          name: m.name,
          currentStock: stock,
          minStock: m.minStock,
          unit: m.unit,
        });
      }
    }

    // Expiry analysis
    const expiryWarningDays = parseInt(process.env.EXPIRY_WARNING_DAYS || "90", 10);
    const approachingBatches = await prisma.productBatch.findMany({
      where: {
        pharmacyId,
        currentQuantity: { gt: 0 },
        expiryDate: {
          gt: now,
          lte: new Date(now.getTime() + expiryWarningDays * 24 * 60 * 60 * 1000),
        },
      },
      include: { medicine: true },
      orderBy: { expiryDate: "asc" },
      take: 10,
    });

    const expiredBatches = await prisma.productBatch.findMany({
      where: {
        pharmacyId,
        currentQuantity: { gt: 0 },
        expiryDate: { lte: now },
      },
      include: { medicine: true },
      orderBy: { expiryDate: "asc" },
    });

    // 6. Last 7 days revenue trend (single query)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const weekSales = await prisma.sale.findMany({
      where: {
        ...baseWhere,
        createdAt: { gte: sevenDaysAgo },
        status: "COMPLETED",
      },
      select: { payableAmount: true, createdAt: true },
    });

    const last7DaysTrend: Array<{ date: string; label: string; revenue: number; count: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
      const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

      const daySales = weekSales.filter(
        (s) => s.createdAt >= dayStart && s.createdAt <= dayEnd
      );
      const dayRevenue = daySales.reduce((acc, s) => acc + s.payableAmount, 0);
      const dayLabel = `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}`;

      last7DaysTrend.push({
        date: d.toISOString().split("T")[0],
        label: dayLabel,
        revenue: dayRevenue,
        count: daySales.length,
      });
    }

    // Pharmacy info for reports header
    const pharmacy = await prisma.pharmacy.findUnique({
      where: { id: pharmacyId },
      select: { name: true, address: true, phone: true },
    });

    return NextResponse.json({
      success: true,
      data: {
        pharmacy: pharmacy || { name: user.pharmacyName || "Dorixona", address: "", phone: "" },
        today: {
          revenue: todayTotalRevenue,
          salesCount: todaySalesCount,
          profit: todayProfit,
          discountTotal: todayDiscountTotal,
          taxTotal: todayTaxTotal,
        },
        month: {
          revenue: monthTotalRevenue,
          salesCount: monthSalesCount,
          profit: monthProfit,
          taxTotal: monthTaxTotal,
        },
        topMedicines,
        analyticsTable,
        cashiersStats,
        inventory: {
          totalMedicinesCount,
          lowStockCount,
          approachingExpiryCount: approachingBatches.length,
          expiredCount: expiredBatches.length,
          lowStockMedicines: lowStockMedicines.slice(0, 10),
          approachingBatches: approachingBatches.map((b) => ({
            id: b.id,
            medicineName: b.medicine.name,
            batchNumber: b.batchNumber,
            quantity: b.currentQuantity,
            expiryDate: b.expiryDate,
          })),
          expiredBatches: expiredBatches.map((b) => ({
            id: b.id,
            medicineName: b.medicine.name,
            batchNumber: b.batchNumber,
            quantity: b.currentQuantity,
            expiryDate: b.expiryDate,
          })),
        },
        last7DaysTrend,
      },
    });
  } catch (error) {
    console.error("Reports API error:", error);
    return NextResponse.json({ success: false, error: "Xatolik yuz berdi" }, { status: 500 });
  }
}
