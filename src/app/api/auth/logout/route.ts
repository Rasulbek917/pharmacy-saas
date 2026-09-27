import { NextResponse } from "next/server";
import { getAuthCookieName, getCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (user) {
      await logAudit({
        pharmacyId: user.pharmacyId,
        userId: user.id,
        userName: user.fullName,
        action: "TIZIMDAN_CHIQILDI",
        entity: "User",
        entityId: user.id,
        details: `${user.fullName} (${user.role}) tizimdan chiqdi`,
      });
    }
  } catch (e) {
    // Ignore audit logging error on logout
  }

  const response = NextResponse.json({
    success: true,
    message: "Tizimdan muvaffaqiyatli chiqildi",
  });

  response.cookies.set({
    name: getAuthCookieName(),
    value: "",
    path: "/",
    expires: new Date(0),
  });

  return response;
}
