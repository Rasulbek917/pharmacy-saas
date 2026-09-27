import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantContext } from "@/lib/tenant";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { context, errorResponse } = await requireTenantContext(req, [
      "SUPER_ADMIN",
      "PHARMACY_ADMIN",
    ]);
    if (errorResponse) return errorResponse;

    const { user, pharmacyId } = context!;
    const body = await req.json();

    const staff = await prisma.user.findFirst({
      where: { id: params.id, pharmacyId },
    });

    if (!staff) {
      return NextResponse.json({ success: false, error: "Xodim topilmadi" }, { status: 404 });
    }

    const updated = await prisma.user.update({
      where: { id: params.id },
      data: {
        status: body.status || staff.status,
        phone: body.phone !== undefined ? body.phone : staff.phone,
        fullName: body.fullName || staff.fullName,
      },
    });

    await logAudit({
      pharmacyId,
      userId: user.id,
      userName: user.fullName,
      action: "XODIM_TAHRIRLANDI",
      entity: "User",
      entityId: params.id,
      details: `Xodim ma'lumotlari yangilandi: ${updated.fullName} (Holat: ${updated.status})`,
    });

    return NextResponse.json({
      success: true,
      message: "Xodim ma'lumotlari yangilandi",
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
    const { context, errorResponse } = await requireTenantContext(req, [
      "SUPER_ADMIN",
      "PHARMACY_ADMIN",
    ]);
    if (errorResponse) return errorResponse;

    const { user, pharmacyId } = context!;

    const staff = await prisma.user.findFirst({
      where: { id: params.id, pharmacyId },
      include: { sales: true },
    });

    if (!staff) {
      return NextResponse.json({ success: false, error: "Xodim topilmadi" }, { status: 404 });
    }

    // If staff has sales, deactivate instead of delete
    if (staff.sales.length > 0) {
      await prisma.user.update({
        where: { id: params.id },
        data: { status: "INACTIVE" },
      });
    } else {
      await prisma.user.delete({
        where: { id: params.id },
      });
    }

    await logAudit({
      pharmacyId,
      userId: user.id,
      userName: user.fullName,
      action: "XODIM_OCHIRILDI",
      entity: "User",
      entityId: params.id,
      details: `Xodim o‘chirildi yoki nofaol qilindi: ${staff.fullName}`,
    });

    return NextResponse.json({
      success: true,
      message: "Xodim muvaffaqiyatli o‘chirildi",
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Xatolik yuz berdi" }, { status: 500 });
  }
}
