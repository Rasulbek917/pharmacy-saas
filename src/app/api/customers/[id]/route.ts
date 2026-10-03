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

    const customer = await prisma.customer.findFirst({
      where: { id: params.id, pharmacyId },
      include: {
        sales: {
          orderBy: { createdAt: "desc" },
          include: {
            cashier: {
              select: { fullName: true },
            },
            items: {
              include: { medicine: true },
            },
          },
        },
      },
    });

    if (!customer) {
      return NextResponse.json({ success: false, error: "Mijoz topilmadi" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: customer });
  } catch (error) {
    logger.error("GET /api\customers\:id\route.ts xatolik", { error: error, route: "/api\customers\:id\route.ts" });
    return NextResponse.json({ success: false, error: "Xatolik yuz berdi" }, { status: 500 });
  }
}
