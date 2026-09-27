import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantContext } from "@/lib/tenant";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { context, errorResponse } = await requireTenantContext(req);
    if (errorResponse) return errorResponse;

    const pharmacy = await prisma.pharmacy.findUnique({
      where: { id: context!.pharmacyId },
      select: {
        id: true,
        name: true,
        address: true,
        phone: true,
        taxRate: true,
        taxIncluded: true,
      },
    });

    if (!pharmacy) {
      return NextResponse.json(
        { success: false, error: { code: "PHARMACY_NOT_FOUND", message: "Dorixona topilmadi" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: pharmacy });
  } catch (error) {
    console.error("Pharmacy settings GET error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Xatolik yuz berdi" } },
      { status: 500 }
    );
  }
}

const settingsUpdateSchema = z.object({
  taxRate: z.number().min(0).max(100).optional(),
  taxIncluded: z.boolean().optional(),
  address: z.string().max(255).optional(),
  phone: z.string().max(32).optional(),
});

export async function PATCH(req: NextRequest) {
  try {
    const { context, errorResponse } = await requireTenantContext(req, ["PHARMACY_ADMIN"]);
    if (errorResponse) return errorResponse;

    const body = await req.json().catch(() => null);
    const parsed = settingsUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.errors.map((e) => e.message).join(", "),
          },
        },
        { status: 400 }
      );
    }

    const pharmacy = await prisma.pharmacy.update({
      where: { id: context!.pharmacyId },
      data: parsed.data,
      select: {
        id: true,
        name: true,
        address: true,
        phone: true,
        taxRate: true,
        taxIncluded: true,
      },
    });

    return NextResponse.json({ success: true, data: pharmacy });
  } catch (error) {
    console.error("Pharmacy settings PATCH error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Xatolik yuz berdi" } },
      { status: 500 }
    );
  }
}
