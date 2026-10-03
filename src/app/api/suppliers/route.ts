import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantContext } from "@/lib/tenant";
import { supplierSchema } from "@/lib/validations";
import { logAudit } from "@/lib/audit";
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
        { contactPerson: { contains: search } },
      ];
    }

    const suppliers = await prisma.supplier.findMany({
      where,
      include: {
        _count: {
          select: { batches: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ success: true, data: suppliers });
  } catch (error) {
    logger.error("GET /api\suppliers\route.ts xatolik", { error: error, route: "/api\suppliers\route.ts" });
    return NextResponse.json({ success: false, error: "Xatolik yuz berdi" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { context, errorResponse } = await requireTenantContext(req, [
      "SUPER_ADMIN",
      "PHARMACY_ADMIN",
    ]);
    if (errorResponse) return errorResponse;

    const { user, pharmacyId } = context!;
    const body = await req.json();
    const validated = supplierSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { success: false, error: validated.error.errors[0]?.message || "Xato ma'lumot" },
        { status: 400 }
      );
    }

    const supplier = await prisma.supplier.create({
      data: {
        pharmacyId,
        ...validated.data,
      },
    });

    await logAudit({
      pharmacyId,
      userId: user.id,
      userName: user.fullName,
      action: "YETKAZIB_BERUVCHI_QOSHILDI",
      entity: "Supplier",
      entityId: supplier.id,
      details: `Yangi yetkazib beruvchi qo‘shildi: ${supplier.name}`,
    });

    return NextResponse.json({
      success: true,
      message: "Yetkazib beruvchi muvaffaqiyatli qo‘shildi",
      data: supplier,
    });
  } catch (error) {
    logger.error("POST /api\suppliers\route.ts xatolik", { error: error, route: "/api\suppliers\route.ts" });
    return NextResponse.json({ success: false, error: "Xatolik yuz berdi" }, { status: 500 });
  }
}
