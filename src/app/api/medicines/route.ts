import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantContext } from "@/lib/tenant";
import { medicineSchema } from "@/lib/validations";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { context, errorResponse } = await requireTenantContext(req);
    if (errorResponse) return errorResponse;

    const { pharmacyId } = context!;
    const search = req.nextUrl.searchParams.get("search")?.trim() || "";
    const categoryId = req.nextUrl.searchParams.get("categoryId") || "";

    const where: any = {
      pharmacyId,
      status: "ACTIVE",
    };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { barcode: { contains: search } },
        { qrCode: { contains: search } },
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    const medicines = await prisma.medicine.findMany({
      where,
      include: {
        category: true,
        manufacturer: true,
        batches: {
          where: {
            currentQuantity: { gt: 0 },
          },
          orderBy: { expiryDate: "asc" }, // FEFO: nearest expiry first!
        },
      },
      orderBy: { name: "asc" },
    });

    const enriched = medicines.map((med) => {
      const totalStock = med.batches.reduce((sum, b) => sum + b.currentQuantity, 0);
      const nearestBatch = med.batches[0] || null;
      return {
        ...med,
        totalStock,
        nearestBatch,
      };
    });

    return NextResponse.json({ success: true, data: enriched });
  } catch (error) {
    console.error("Medicines GET error:", error);
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: "Xatolik yuz berdi" } }, { status: 500 });
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
    const validated = medicineSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: validated.error.errors[0]?.message || "Xato ma'lumot" } },
        { status: 400 }
      );
    }

    const { name, barcode, qrCode, categoryId, manufacturerId, salePrice, minStock, unit, description } =
      validated.data;

    // Check barcode uniqueness if provided
    if (barcode) {
      const existing = await prisma.medicine.findFirst({
        where: {
          pharmacyId,
          barcode,
          status: "ACTIVE",
        },
      });
      if (existing) {
        return NextResponse.json(
          { success: false, error: { code: "DUPLICATE_BARCODE", message: "Bu shtrix-kodga ega dori tizimda allaqachon mavjud!" } },
          { status: 400 }
        );
      }
    }

    const medicine = await prisma.medicine.create({
      data: {
        pharmacyId,
        name,
        barcode: barcode || null,
        qrCode: qrCode || null,
        categoryId: categoryId || null,
        manufacturerId: manufacturerId || null,
        salePrice,
        minStock,
        unit,
        description: description || null,
        status: "ACTIVE",
      },
    });

    await logAudit({
      pharmacyId,
      userId: user.id,
      userName: user.fullName,
      action: "DORI_QOSHILDI",
      entity: "Medicine",
      entityId: medicine.id,
      details: `Yangi dori qo‘shildi: ${medicine.name} (Narxi: ${medicine.salePrice} so'm)`,
    });

    return NextResponse.json({
      success: true,
      message: "Dori vositasi muvaffaqiyatli qo‘shildi",
      data: medicine,
    });
  } catch (error) {
    console.error("Medicine POST error:", error);
    return NextResponse.json({ success: false, error: "Dori qo‘shishda xatolik" }, { status: 500 });
  }
}
