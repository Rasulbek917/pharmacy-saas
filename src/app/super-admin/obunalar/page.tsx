"use client";

import React, { useState, useEffect } from "react";
import { CreditCard, Zap, CheckCircle, Clock, ShieldAlert, RefreshCw } from "lucide-react";
import { formatDate, getPharmacyStatusBadge } from "@/lib/formatters";

export default function SubscriptionsPage() {
  const [pharmacies, setPharmacies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [planId, setPlanId] = useState<string>("ORTACHA");

  const PLANS = [
    { id: "ORTACHA", label: "O‘rtacha — 30 kun (350 000 so‘m)", planName: "O‘rtacha (30 kun)", durationDays: 30, price: 350000 },
    { id: "MAX", label: "Max — 90 kun (900 000 so‘m)", planName: "Max (90 kun)", durationDays: 90, price: 900000 },
  ];
  const selectedPlan = PLANS.find((p) => p.id === planId) || PLANS[0];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/pharmacies");
      const data = await res.json();
      if (data.success) {
        setPharmacies(data.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleActivate = async (pharmacy: any) => {
    if (
      !confirm(
        `"${pharmacy.name}" dorixonasi uchun "${selectedPlan.planName}" tarifini faollashtirasizmi? (${selectedPlan.durationDays} kun, ${selectedPlan.price.toLocaleString("uz-UZ")} so‘m)`
      )
    ) {
      return;
    }

    setActivatingId(pharmacy.id);
    try {
      const res = await fetch(`/api/pharmacies/${pharmacy.id}/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planName: selectedPlan.planName,
          durationDays: selectedPlan.durationDays,
          price: selectedPlan.price,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        loadData();
      } else {
        alert(data.error || "Xatolik yuz berdi");
      }
    } catch (e) {
      alert("Server xatosi");
    } finally {
      setActivatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">
            Obuna va Sinov (Trial) Boshqaruvi
          </h2>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            7 kunlik bepul sinov va 30 kunlik oylik obunalar monitoringi
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={planId}
            onChange={(e) => setPlanId(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 focus:border-emerald-500 focus:outline-none shadow-sm"
            title="Faollashtirish uchun tarif"
          >
            {PLANS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>

          <button
            onClick={loadData}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            <span>Yangilash</span>
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3.5">Dorixona</th>
                <th className="px-4 py-3.5">Obuna Turi</th>
                <th className="px-4 py-3.5">Holati</th>
                <th className="px-4 py-3.5">Boshlangan Sana</th>
                <th className="px-4 py-3.5">Tugash Sanasi</th>
                <th className="px-4 py-3.5">Qolgan Muddat</th>
                <th className="px-5 py-3.5 text-right">Amal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-slate-400">
                    Yuklanmoqda...
                  </td>
                </tr>
              ) : pharmacies.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-slate-400">
                    Dorixonalar mavjud emas.
                  </td>
                </tr>
              ) : (
                pharmacies.map((pharmacy) => {
                  const badge = getPharmacyStatusBadge(pharmacy.status);
                  const isTrial = pharmacy.status === "TRIAL";
                  const startDate = isTrial ? pharmacy.trialStartDate : pharmacy.subscriptionStartDate;
                  const endDate = isTrial ? pharmacy.trialEndDate : pharmacy.subscriptionEndDate;

                  return (
                    <tr key={pharmacy.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-slate-900">
                        {pharmacy.name}
                        <span className="block text-[11px] font-normal text-slate-500">
                          {pharmacy.phone}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 font-semibold text-slate-800">
                        {isTrial
                          ? "7 kunlik Sinov (Trial)"
                          : pharmacy.subscriptions?.[0]?.planName || "30 kunlik Oylik Obuna"}
                      </td>

                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${badge.badgeClass}`}
                        >
                          {badge.label}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-slate-600">{formatDate(startDate)}</td>
                      <td className="px-4 py-3.5 text-slate-600">{formatDate(endDate)}</td>

                      <td className="px-4 py-3.5 font-bold">
                        {pharmacy.status === "BLOCKED" ? (
                          <span className="text-red-600">Obuna tugagan (Bloklangan)</span>
                        ) : (
                          <span
                            className={
                              pharmacy.daysRemaining <= 3 ? "text-red-600" : "text-emerald-700"
                            }
                          >
                            {pharmacy.daysRemaining} kun qoldi
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => handleActivate(pharmacy)}
                          disabled={activatingId === pharmacy.id}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                        >
                          <Zap className="h-3.5 w-3.5" />
                          <span>{selectedPlan.durationDays} Kun Faollashtirish</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
