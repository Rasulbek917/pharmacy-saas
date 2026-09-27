import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantContext } from "@/lib/tenant";

export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  try {
    const { context, errorResponse } = await requireTenantContext(req, [
      "SUPER_ADMIN",
      "PHARMACY_ADMIN",
    ]);
    if (errorResponse) return errorResponse;

    const { user, pharmacyId } = context!;
    const action = req.nextUrl.searchParams.get("action");
    const entity = req.nextUrl.searchParams.get("entity");

    const where: any = {};
    if (user.role !== "SUPER_ADMIN") {
      where.pharmacyId = pharmacyId;
    } else {
      const qPharmacyId = req.nextUrl.searchParams.get("pharmacyId");
      if (qPharmacyId) where.pharmacyId = qPharmacyId;
    }

    if (action) where.action = action;
    if (entity) where.entity = entity;

    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        pharmacy: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ success: true, data: logs });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Xatolik yuz berdi" }, { status: 500 });
  }
}
