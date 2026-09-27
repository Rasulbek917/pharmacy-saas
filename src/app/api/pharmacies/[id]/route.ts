import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiAuth } from "@/lib/tenant";
import { updatePharmacySchema } from "@/lib/validations";
import { logAudit } from "@/lib/audit";
import { getDaysRemaining } from "@/lib/formatters";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, errorResponse } = await requireApiAuth(req, ["SUPER_ADMIN"]);
    if (errorResponse) return errorResponse;

    const pharmacy = await prisma.pharmacy.findUnique({
      where: { id: params.id },
      include: {
        users: {
          select: {
            id: true,
            fullName: true,
            username: true,
            role: true,
            phone: true,
            status: true,
            createdAt: true,
          },
        },
        subscriptions: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
        _count: {
          select: {
            medicines: true,
            sales: true,
            suppliers: true,
          },
        },
      },
    });

    if (!pharmacy) {
      return NextResponse.json({ success: false, error: "Dorixona topilmadi" }, { status: 404 });
    }

    let daysRemaining = 0;
    if (pharmacy.status === "TRIAL" && pharmacy.trialEndDate) {
      daysRemaining = getDaysRemaining(pharmacy.trialEndDate);
    } else if (pharmacy.status === "ACTIVE" && pharmacy.subscriptionEndDate) {
      daysRemaining = getDaysRemaining(pharmacy.subscriptionEndDate);
    }

    return NextResponse.json({
      success: true,
      data: {
        ...pharmacy,
        daysRemaining,
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Xatolik yuz berdi" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, errorResponse } = await requireApiAuth(req, ["SUPER_ADMIN"]);
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const validated = updatePharmacySchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { success: false, error: validated.error.errors[0]?.message || "Xato ma'lumot" },
        { status: 400 }
      );
    }

    const currentPharmacy = await prisma.pharmacy.findUnique({
      where: { id: params.id },
    });

    if (!currentPharmacy) {
      return NextResponse.json({ success: false, error: "Dorixona topilmadi" }, { status: 404 });
    }

    const updated = await prisma.pharmacy.update({
      where: { id: params.id },
      data: validated.data,
    });

    // Check if status changed
    if (validated.data.status && validated.data.status !== currentPharmacy.status) {
      const action =
        validated.data.status === "BLOCKED"
          ? "DORIXONA_BLOKLANDI"
          : validated.data.status === "ACTIVE"
          ? "DORIXONA_OCHILDI"
          : "DORIXONA_HOLATI_OZGARDI";

      await logAudit({
        userId: user.id,
        userName: user.fullName,
        action,
        entity: "Pharmacy",
        entityId: params.id,
        details: `Dorixona holati o'zgartirildi: ${currentPharmacy.status} -> ${validated.data.status}`,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Dorixona ma'lumotlari muvaffaqiyatli yangilandi",
      data: updated,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Xatolik yuz berdi" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, errorResponse } = await requireApiAuth(req, ["SUPER_ADMIN"]);
    if (errorResponse) return errorResponse;

    const pharmacy = await prisma.pharmacy.update({
      where: { id: params.id },
      data: { status: "DELETED" },
    });

    await logAudit({
      userId: user.id,
      userName: user.fullName,
      action: "DORIXONA_OCHIRILDI",
      entity: "Pharmacy",
      entityId: params.id,
      details: `Dorixona soft-delete qilindi: ${pharmacy.name}`,
    });

    return NextResponse.json({
      success: true,
      message: "Dorixona muvaffaqiyatli o‘chirildi",
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Xatolik yuz berdi" }, { status: 500 });
  }
}
