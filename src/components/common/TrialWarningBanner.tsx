"use client";

import React from "react";
import { AlertTriangle, Clock } from "lucide-react";
import { AuthUser } from "@/types";

export default function TrialWarningBanner({ user }: { user: AuthUser }) {
  if (user.role === "SUPER_ADMIN") return null;

  let message: string | null = null;
  let isUrgent = false;

  // Check trial days
  if (user.trialDaysLeft !== null && user.trialDaysLeft !== undefined) {
    if (user.trialDaysLeft <= 1) {
      message = "Obunangiz ertaga tugaydi. Tizim to‘xtab qolmasligi uchun obunani faollashtiring.";
      isUrgent = true;
    } else if (user.trialDaysLeft <= 3) {
      message = `Obunangiz tugashiga ${user.trialDaysLeft} kun qoldi.`;
      isUrgent = true;
    } else if (user.trialDaysLeft <= 7) {
      message = `Obunangiz tugashiga ${user.trialDaysLeft} kun qoldi.`;
    }
  }

  // Check subscription days
  if (!message && user.subscriptionDaysLeft !== null && user.subscriptionDaysLeft !== undefined) {
    if (user.subscriptionDaysLeft <= 1) {
      message = "Obunangiz ertaga tugaydi. Xizmat uzluksiz ishlashi uchun obunani yangilang.";
      isUrgent = true;
    } else if (user.subscriptionDaysLeft <= 3) {
      message = `Obunangiz tugashiga ${user.subscriptionDaysLeft} kun qoldi.`;
      isUrgent = true;
    } else if (user.subscriptionDaysLeft <= 7) {
      message = `Obunangiz tugashiga ${user.subscriptionDaysLeft} kun qoldi.`;
    }
  }

  if (!message) return null;

  return (
    <div
      className={`mx-4 mt-4 flex items-center gap-3 rounded-xl p-3.5 text-xs font-semibold md:mx-6 border ${
        isUrgent
          ? "bg-red-50 text-red-800 border-red-200"
          : "bg-amber-50 text-amber-800 border-amber-200"
      }`}
    >
      <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
      <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <span>{message}</span>
        <span className="text-[11px] text-slate-500 font-normal">
          Batafsil ma'lumot uchun Super Administratorga murojaat qiling.
        </span>
      </div>
    </div>
  );
}
