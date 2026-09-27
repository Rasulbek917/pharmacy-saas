"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Building2,
  CheckCircle,
  Clock,
  ShieldAlert,
  Plus,
  RefreshCw,
  Zap,
  ArrowRight,
} from "lucide-react";
import { formatCurrency, formatDate, getPharmacyStatusBadge } from "@/lib/formatters";

export default function SuperAdminDashboard() {
  const [pharmacies, setPharmacies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    loadPharmacies();
  }, []);

  const loadPharmacies = async () => {
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

  const handleActivate = async (id: string, name: string) => {
    if (!confirm(`"${name}" dorixonasi uchun 30 kunlik oylik obunani faollashtirasizmi?`)) {
      return;
    }

    setActivatingId(id);
    setActionMsg(null);
    try {
      const res = await fetch(`/api/pharmacies/${id}/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ durationDays: 30, price: 350000 }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMsg({ text: data.message, type: "success" });
        loadPharmacies();
      } else {
        setActionMsg({ text: data.error || "Xatolik yuz berdi", type: "error" });
      }
    } catch (e) {
      setActionMsg({ text: "Server bilan bog'lanishda xatolik", type: "error" });
    } finally {
      setActivatingId(null);
    }
  };

  const totalPharmacies = pharmacies.length;
  const activeCount = pharmacies.filter((p) => p.status === "ACTIVE").length;
  const trialCount = pharmacies.filter((p) => p.status === "TRIAL").length;
  const blockedCount = pharmacies.filter((p) => p.status === "BLOCKED").length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">
            Super Administrator Boshqaruv Paneli
          </h2>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Barcha dorixonalar, sinov muddatlari va obunalar monitoringi
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadPharmacies}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"
            title="Yangilash"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            <span>Yangilash</span>
          </button>

          <Link
            href="/super-admin/dorixonalar?yangi=1"
            className="flex items-center gap-1.5 rounded-xl bg-[#16A34A] px-4 py-2 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-[#15803D] transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Yangi Dorixona Qo‘shish</span>
          </Link>
        </div>
      </div>

      {/* Action Notification */}
      {actionMsg && (
        <div
          className={`rounded-xl p-4 text-xs font-bold animate-in fade-in ${
            actionMsg.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {actionMsg.text}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Jami Dorixonalar
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <Building2 className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-extrabold text-slate-900">{totalPharmacies}</p>
          <p className="mt-1 text-[11px] text-slate-400">Platformadagi barcha tenantlar</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Aktiv Obunada
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <CheckCircle className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-extrabold text-emerald-700">{activeCount}</p>
          <p className="mt-1 text-[11px] text-emerald-600 font-medium">To‘lov qilgan dorixonalar</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Sinov Davrida (Trial)
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-extrabold text-blue-700">{trialCount}</p>
          <p className="mt-1 text-[11px] text-blue-600 font-medium">7 kunlik bepul sinovda</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Bloklanganlar
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-100 text-red-700">
              <ShieldAlert className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-extrabold text-red-700">{blockedCount}</p>
          <p className="mt-1 text-[11px] text-red-600 font-medium">Obunasi tugagan</p>
        </div>
      </div>

      {/* Pharmacies List */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="text-sm md:text-base font-bold text-slate-900">
              Dorixonalar Ro‘yxati va Obuna Holati
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Sinov muddati va oylik obunalarni boshqarish
            </p>
          </div>
          <Link
            href="/super-admin/dorixonalar"
            className="flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800"
          >
            <span>Barchasini ko‘rish</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3.5">Dorixona Nomi</th>
                <th className="px-4 py-3.5">Admin & Telefon</th>
                <th className="px-4 py-3.5">Holati</th>
                <th className="px-4 py-3.5">Obuna / Sinov Muddat</th>
                <th className="px-4 py-3.5">Qolgan Kun</th>
                <th className="px-5 py-3.5 text-right">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
                      <span>Yuklanmoqda...</span>
                    </div>
                  </td>
                </tr>
              ) : pharmacies.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-slate-400">
                    Dorixonalar mavjud emas. Yangi dorixona qo‘shing.
                  </td>
                </tr>
              ) : (
                pharmacies.map((pharmacy) => {
                  const badge = getPharmacyStatusBadge(pharmacy.status);
                  const isActivating = activatingId === pharmacy.id;

                  return (
                    <tr key={pharmacy.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-slate-900">
                        {pharmacy.name}
                        <span className="block text-[11px] font-normal text-slate-500">
                          {pharmacy.address}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="font-semibold text-slate-800">{pharmacy.adminName}</span>
                        <span className="block text-[11px] text-slate-500">{pharmacy.phone}</span>
                      </td>

                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${badge.badgeClass}`}
                        >
                          {badge.label}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-[11px]">
                        {pharmacy.status === "TRIAL" ? (
                          <div>
                            <span className="font-semibold text-blue-700">7 kunlik Sinov</span>
                            <span className="block text-slate-500">
                              Tugaydi: {formatDate(pharmacy.trialEndDate)}
                            </span>
                          </div>
                        ) : pharmacy.status === "ACTIVE" ? (
                          <div>
                            <span className="font-semibold text-emerald-700">Oylik Obuna</span>
                            <span className="block text-slate-500">
                              Tugaydi: {formatDate(pharmacy.subscriptionEndDate)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-red-600 font-semibold">Tugagan / Bloklangan</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5">
                        {pharmacy.status === "BLOCKED" ? (
                          <span className="font-bold text-red-600">0 kun (To‘xtatilgan)</span>
                        ) : (
                          <span
                            className={`font-bold ${
                              pharmacy.daysRemaining <= 3 ? "text-red-600" : "text-slate-800"
                            }`}
                          >
                            {pharmacy.daysRemaining} kun
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Super Admin Activate Button (Section 10 Requirement) */}
                          <button
                            onClick={() => handleActivate(pharmacy.id, pharmacy.name)}
                            disabled={isActivating}
                            className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                            title="Obunani 30 kunga uzaytirish va faollashtirish"
                          >
                            <Zap className="h-3.5 w-3.5" />
                            <span>
                              {isActivating ? "Yuklanmoqda..." : "Obunani Faollashtirish"}
                            </span>
                          </button>
                        </div>
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
