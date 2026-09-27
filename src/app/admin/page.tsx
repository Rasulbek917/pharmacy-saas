"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  DollarSign,
  ShoppingCart,
  Boxes,
  AlertTriangle,
  Clock,
  TrendingUp,
  ArrowRight,
  RefreshCw,
  Plus,
  Pill,
  Users,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";

export default function AdminDashboardPage() {
  const [reports, setReports] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/reports");
      const data = await res.json();
      if (data.success) {
        setReports(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const today = reports?.today || { revenue: 0, salesCount: 0, profit: 0, discountTotal: 0 };
  const inventory = reports?.inventory || {
    totalMedicinesCount: 0,
    lowStockCount: 0,
    approachingExpiryCount: 0,
    expiredCount: 0,
  };
  const topMedicines = reports?.topMedicines || [];
  const cashiersStats = reports?.cashiersStats || [];
  const trend = reports?.last7DaysTrend || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">
            Dorixona Boshqaruv Dashboardi
          </h2>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Real vaqtdagi savdo, ombor holati va moliyaviy ko‘rsatkichlar
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadReports}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            <span>Yangilash</span>
          </button>

          <Link
            href="/kassir"
            className="flex items-center gap-1.5 rounded-xl bg-[#16A34A] px-4 py-2 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-[#15803D]"
          >
            <ShoppingCart className="h-4 w-4" />
            <span>Savdo (POS)</span>
          </Link>
        </div>
      </div>

      {/* 6 Key KPI Cards (Section 26 requirement) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 lg:gap-4">
        {/* 1. Bugungi savdo */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Bugungi Savdo
          </span>
          <p className="mt-2 text-lg sm:text-xl font-extrabold text-[#16A34A]">
            {formatCurrency(today.revenue)}
          </p>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Jami tushum</span>
        </div>

        {/* 2. Sotuvlar soni */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Sotuvlar Soni
          </span>
          <p className="mt-2 text-lg sm:text-xl font-extrabold text-slate-900">
            {today.salesCount} ta
          </p>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Bugungi cheklar</span>
        </div>

        {/* 3. Ombordagi mahsulotlar */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Ombordagi Turlar
          </span>
          <p className="mt-2 text-lg sm:text-xl font-extrabold text-slate-900">
            {inventory.totalMedicinesCount} ta
          </p>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Faol dori vositalari</span>
        </div>

        {/* 4. Kam qolgan mahsulotlar */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 shadow-sm">
          <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">
            Kam Qolgan
          </span>
          <p className="mt-2 text-lg sm:text-xl font-extrabold text-amber-700">
            {inventory.lowStockCount} ta
          </p>
          <span className="text-[10px] text-amber-600 mt-0.5 block">Minimal chegarada</span>
        </div>

        {/* 5. Muddati yaqin mahsulotlar */}
        <div className="rounded-2xl border border-red-200 bg-red-50/60 p-4 shadow-sm">
          <span className="text-[11px] font-bold text-red-800 uppercase tracking-wider block">
            Muddati Yaqin
          </span>
          <p className="mt-2 text-lg sm:text-xl font-extrabold text-red-600">
            {inventory.approachingExpiryCount} ta
          </p>
          <span className="text-[10px] text-red-500 mt-0.5 block">90 kun ichida</span>
        </div>

        {/* 6. Bugungi sof foyda */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Bugungi Sof Foyda
          </span>
          <p className="mt-2 text-lg sm:text-xl font-extrabold text-emerald-700">
            {formatCurrency(today.profit)}
          </p>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Chiqimlar ayirilganda</span>
        </div>
      </div>

      {/* Middle Section: 7-Day Revenue Trend Chart & Top Selling Medicines */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* 7-Day Revenue Trend Visualization */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Oxirgi 7 Kunlik Savdo Grafigi
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Kunlar bo‘yicha tushum dinamikasi</p>
            </div>
            <TrendingUp className="h-5 w-5 text-emerald-600" />
          </div>

          <div className="mt-6 flex h-48 items-end gap-2 sm:gap-4 pt-6">
            {trend.map((item: any, i: number) => {
              const maxRevenue = Math.max(...trend.map((t: any) => t.revenue), 100000);
              const heightPercent = Math.max(12, Math.round((item.revenue / maxRevenue) * 100));

              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                  <span className="text-[10px] font-bold text-slate-700 hidden sm:block">
                    {item.revenue > 0 ? `${Math.round(item.revenue / 1000)}k` : "0"}
                  </span>
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className="w-full max-w-[42px] rounded-t-lg bg-emerald-600 hover:bg-emerald-700 transition-all duration-300 relative group cursor-pointer"
                  >
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block rounded bg-slate-900 px-2 py-1 text-[10px] text-white whitespace-nowrap z-20">
                      {formatCurrency(item.revenue)} ({item.count} ta sotuv)
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500">{item.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Selling Medicines */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900">Eng Ko‘p Sotilgan Dorilar</h3>
            <Pill className="h-5 w-5 text-emerald-600" />
          </div>

          <div className="mt-4 divide-y divide-slate-100">
            {topMedicines.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-400">
                Ushbu oyda hali sotuvlar amalga oshirilmagan
              </p>
            ) : (
              topMedicines.slice(0, 5).map((med: any, idx: number) => (
                <div key={med.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 font-bold text-[10px] text-slate-600">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="font-bold text-slate-800">{med.name}</p>
                      <p className="text-[11px] text-slate-500">
                        {med.totalQuantity} {med.unit} sotildi
                      </p>
                    </div>
                  </div>
                  <span className="font-bold text-emerald-700">
                    {formatCurrency(med.totalRevenue)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Cashiers Performance Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="text-sm md:text-base font-bold text-slate-900">
              Kassirlar Bo‘yicha Savdo Natijalari (Oylik)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Har bir kassirning sotuvlar soni va umumiy tushumi
            </p>
          </div>
          <Link
            href="/admin/xodimlar"
            className="flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800"
          >
            <span>Xodimlarni boshqarish</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3.5">Kassir Ismi</th>
                <th className="px-4 py-3.5">Logini</th>
                <th className="px-4 py-3.5">Sotuvlar Soni</th>
                <th className="px-4 py-3.5">Sotilgan Tovarlar</th>
                <th className="px-5 py-3.5 text-right">Umumiy Tushum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cashiersStats.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs text-slate-400">
                    Kassirlar faoliyati hali qayd etilmadi.
                  </td>
                </tr>
              ) : (
                cashiersStats.map((c: any) => (
                  <tr key={c.cashierId} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-slate-900">{c.fullName}</td>
                    <td className="px-4 py-3.5 text-slate-500 font-mono text-[11px]">{c.username}</td>
                    <td className="px-4 py-3.5 font-semibold text-slate-800">{c.salesCount} ta</td>
                    <td className="px-4 py-3.5 text-slate-600">{c.totalItemsSold} dona</td>
                    <td className="px-5 py-3.5 text-right font-extrabold text-emerald-700 text-sm">
                      {formatCurrency(c.totalRevenue)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
