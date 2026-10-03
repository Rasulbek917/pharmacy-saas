import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantContext } from "@/lib/tenant";
import { manufacturerSchema } from "@/lib/validations";
import { logAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { context, errorResponse } = await requireTenantContext(req);
    if (errorResponse) return errorResponse;

    const { pharmacyId } = context!;

    const manufacturers = await prisma.manufacturer.findMany({
      where: { pharmacyId },
      include: {
        _count: {
          select: { medicines: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ success: true, data: manufacturers });
  } catch (error: any) {
    logger.error("Manufacturers GET error", { error: error });
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Ishlab chiqaruvchilarni yuklashda xatolik yuz berdi" } },
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
    const validated = manufacturerSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: validated.error.errors[0]?.message || "Xato ishlab chiqaruvchi ma'lumotlari",
          },
        },
        { status: 400 }
      );
    }

    const { name, country } = validated.data;

    // Check duplicate
    const existing = await prisma.manufacturer.findFirst({
      where: { pharmacyId, name: { equals: name } },
    });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "DUPLICATE_MANUFACTURER",
            message: `"${name}" nomli ishlab chiqaruvchi allaqachon mavjud!`,
          },
        },
        { status: 400 }
      );
    }

    const manufacturer = await prisma.manufacturer.create({
      data: {
        pharmacyId,
        name,
        country: country || null,
      },
    });

    await logAudit({
      pharmacyId,
      userId: user.id,
      userName: user.fullName,
      action: "ISHLAB_CHIQARUVCHI_YARATILDI",
      entity: "Manufacturer",
      entityId: manufacturer.id,
      details: `Yangi ishlab chiqaruvchi yaratildi: "${manufacturer.name}" (${country || "Mamlakat ko'rsatilmagan"})`,
    });

    return NextResponse.json({
      success: true,
      message: "Ishlab chiqaruvchi muvaffaqiyatli yaratildi",
      data: manufacturer,
    });
  } catch (error: any) {
    logger.error("Manufacturer POST error", { error: error });
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message || "Xatolik yuz berdi" } },
      { status: 500 }
    );
  }
}
