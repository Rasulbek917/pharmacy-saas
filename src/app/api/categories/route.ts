import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantContext } from "@/lib/tenant";
import { categorySchema } from "@/lib/validations";
import { logAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { context, errorResponse } = await requireTenantContext(req);
    if (errorResponse) return errorResponse;

    const { pharmacyId } = context!;

    const categories = await prisma.category.findMany({
      where: { pharmacyId },
      include: {
        _count: {
          select: { medicines: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ success: true, data: categories });
  } catch (error: any) {
    logger.error("Categories GET error", { error: error });
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Kategoriyalarni yuklashda xatolik yuz berdi" } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { context, errorResponse } = await requireTenantContext(req, [
      "SUPER_ADMIN",
      "PHARMACY_ADMIN",
      "WAREHOUSEMAN",
    ]);
    if (errorResponse) return errorResponse;

    const { user, pharmacyId } = context!;
    const body = await req.json();
    const validated = categorySchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: validated.error.errors[0]?.message || "Xato kategoriya ma'lumotlari",
          },
        },
        { status: 400 }
      );
    }

    const { name, description } = validated.data;

    // Check duplicate
    const existing = await prisma.category.findFirst({
      where: { pharmacyId, name: { equals: name } },
    });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "DUPLICATE_CATEGORY",
            message: `"${name}" nomli kategoriya allaqachon mavjud!`,
          },
        },
        { status: 400 }
      );
    }

    const category = await prisma.category.create({
      data: {
        pharmacyId,
        name,
        description: description || null,
      },
    });

    await logAudit({
      pharmacyId,
      userId: user.id,
      userName: user.fullName,
      action: "KATEGORIYA_YARATILDI",
      entity: "Category",
      entityId: category.id,
      details: `Yangi kategoriya yaratildi: "${category.name}"`,
    });

    return NextResponse.json({
      success: true,
      message: "Kategoriya muvaffaqiyatli yaratildi",
      data: category,
    });
  } catch (error: any) {
    logger.error("Category POST error", { error: error });
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message || "Xatolik yuz berdi" } },
      { status: 500 }
    );
  }
}
