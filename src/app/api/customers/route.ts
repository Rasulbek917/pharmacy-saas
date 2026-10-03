import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantContext } from "@/lib/tenant";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  try {
    const { context, errorResponse } = await requireTenantContext(req);
    if (errorResponse) return errorResponse;

    const { pharmacyId } = context!;
    const search = req.nextUrl.searchParams.get("search")?.trim() || "";

    const where: any = { pharmacyId };
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    const customers = await prisma.customer.findMany({
      where,
      include: {
        _count: {
          select: { sales: true },
        },
      },
      orderBy: { totalSpent: "desc" },
    });

    return NextResponse.json({ success: true, data: customers });
  } catch (error) {
    logger.error("GET /api\customers\route.ts xatolik", { error: error, route: "/api\customers\route.ts" });
    return NextResponse.json({ success: false, error: "Xatolik yuz berdi" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { context, errorResponse } = await requireTenantContext(req);
    if (errorResponse) return errorResponse;

    const { pharmacyId } = context!;
    const body = await req.json();

    if (!body.name || body.name.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: "Mijoz ismi kamida 2 ta belgi bo‘lishi kerak" },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.create({
      data: {
        pharmacyId,
        name: body.name.trim(),
        phone: body.phone?.trim() || null,
        notes: body.notes || null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Mijoz muvaffaqiyatli qo‘shildi",
      data: customer,
    });
  } catch (error) {
    logger.error("POST /api\customers\route.ts xatolik", { error: error, route: "/api\customers\route.ts" });
    return NextResponse.json({ success: false, error: "Xatolik yuz berdi" }, { status: 500 });
  }
}
