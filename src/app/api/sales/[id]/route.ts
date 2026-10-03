import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantContext } from "@/lib/tenant";
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

    const sale = await prisma.sale.findFirst({
      where: {
        id: params.id,
        pharmacyId,
      },
      include: {
        pharmacy: true,
        cashier: {
          select: { id: true, fullName: true, username: true },
        },
        customer: true,
        items: {
          include: {
            medicine: true,
            batch: true,
          },
        },
        payments: true,
      },
    });

    if (!sale) {
      return NextResponse.json({ success: false, error: "Chek / Sotuv topilmadi" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: sale });
  } catch (error) {
    logger.error("GET /api\sales\:id\route.ts xatolik", { error: error, route: "/api\sales\:id\route.ts" });
    return NextResponse.json({ success: false, error: "Xatolik yuz berdi" }, { status: 500 });
  }
}
