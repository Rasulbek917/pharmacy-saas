import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantContext } from "@/lib/tenant";
import { getExpiryStatus, getDaysRemaining } from "@/lib/formatters";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { context, errorResponse } = await requireTenantContext(req);
    if (errorResponse) return errorResponse;

    const { pharmacyId } = context!;
    const status = req.nextUrl.searchParams.get("status"); // NORMAL, APPROACHING, EXPIRED
    const search = req.nextUrl.searchParams.get("search")?.trim() || "";

    const where: any = {
      pharmacyId,
    };

    if (search) {
      where.OR = [
        { batchNumber: { contains: search } },
        { medicine: { name: { contains: search } } },
        { medicine: { barcode: { contains: search } } },
      ];
    }

    const batches = await prisma.productBatch.findMany({
      where,
      include: {
        medicine: true,
        supplier: true,
      },
      orderBy: { expiryDate: "asc" },
    });

    const now = new Date();
    const enriched = batches.map((b) => {
      const expStatus = getExpiryStatus(b.expiryDate);
      const daysLeft = getDaysRemaining(b.expiryDate);

      return {
        ...b,
        status: expStatus.status,
        statusLabel: expStatus.label,
        statusBadgeClass: expStatus.badgeClass,
        daysLeft,
      };
    });

    // Filter by computed status if requested
    const filtered = status
      ? enriched.filter((b) => b.status === status)
      : enriched;

    return NextResponse.json({ success: true, data: filtered });
  } catch (error) {
    console.error("Batches GET error:", error);
    return NextResponse.json({ success: false, error: "Xatolik yuz berdi" }, { status: 500 });
  }
}
