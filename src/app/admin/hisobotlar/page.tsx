"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart3,
  Calendar,
  DollarSign,
  TrendingUp,
  Pill,
  Users,
  Boxes,
  Printer,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Building2,
} from "lucide-react";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/formatters";

export default function ReportsPage() {
  const [reports, setReports] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "ANALYTICS" | "DAILY" | "MONTHLY" | "CASHIERS" | "INVENTORY"
  >("ANALYTICS");
  const [searchFilter, setSearchFilter] = useState("");
  const [sortBy, setSortBy] = useState<"revenue" | "quantity" | "profit">("revenue");

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

  const pharmacy = reports?.pharmacy || { name: "Dorixona Boshqaruv Tizimi", address: "", phone: "" };
  const today = reports?.today || { revenue: 0, salesCount: 0, profit: 0, discountTotal: 0, taxTotal: 0 };
  const month = reports?.month || { revenue: 0, salesCount: 0, profit: 0, taxTotal: 0 };
  const topMedicines = reports?.topMedicines || [];
  const analyticsTable = reports?.analyticsTable || [];
  const cashiersStats = reports?.cashiersStats || [];
  const inventory = reports?.inventory || {
    totalMedicinesCount: 0,
    lowStockCount: 0,
    approachingExpiryCount: 0,
    expiredCount: 0,
    lowStockMedicines: [],
    approachingBatches: [],
    expiredBatches: [],
  };

  // Filter and sort analytics table
  const filteredAnalytics = analyticsTable
    .filter((item: any) => {
      if (!searchFilter.trim()) return true;
      const q = searchFilter.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        item.categoryName.toLowerCase().includes(q) ||
        item.barcode.includes(q)
      );
    })
    .sort((a: any, b: any) => {
      if (sortBy === "quantity") return b.totalQuantity - a.totalQuantity;
      if (sortBy === "profit") return b.totalProfit - a.totalProfit;
      return b.totalRevenue - a.totalRevenue;
    });

  const totalAnalyticsRevenue = filteredAnalytics.reduce((sum: number, i: any) => sum + i.totalRevenue, 0);
  const totalAnalyticsProfit = filteredAnalytics.reduce((sum: number, i: any) => sum + i.totalProfit, 0);
  const totalAnalyticsQty = filteredAnalytics.reduce((sum: number, i: any) => sum + i.totalQuantity, 0);

  // Dedicated Print Report Handler
  const handlePrintReport = () => {
    document.body.classList.add("printing-report");
    window.print();
    setTimeout(() => {
      document.body.classList.remove("printing-report");
    }, 1000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 no-print">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">
            Hisobotlar va Tahliliy Statistika
          </h2>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Real vaqt tahlili, dori realizatsiyasi, kassa unumdorligi va ombor qoldiqlari
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadReports}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm"
            title="Yangilash"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            <span>Yangilash</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-white rounded-2xl p-1.5 shadow-sm space-x-1 no-print overflow-x-auto">
        <button
          onClick={() => setActiveTab("ANALYTICS")}
          className={`flex-1 min-w-[130px] rounded-xl py-2.5 text-xs font-bold transition-all ${
            activeTab === "ANALYTICS"
              ? "bg-[#16A34A] text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Tahlillar Jadvali
        </button>

        <button
          onClick={() => setActiveTab("DAILY")}
          className={`flex-1 min-w-[120px] rounded-xl py-2.5 text-xs font-bold transition-all ${
            activeTab === "DAILY"
              ? "bg-[#16A34A] text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Kunlik Hisobot
        </button>

        <button
          onClick={() => setActiveTab("MONTHLY")}
          className={`flex-1 min-w-[140px] rounded-xl py-2.5 text-xs font-bold transition-all ${
            activeTab === "MONTHLY"
              ? "bg-[#16A34A] text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Oylik Tushum & Foyda
        </button>

        <button
          onClick={() => setActiveTab("CASHIERS")}
          className={`flex-1 min-w-[130px] rounded-xl py-2.5 text-xs font-bold transition-all ${
            activeTab === "CASHIERS"
              ? "bg-[#16A34A] text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Kassirlar Faoliyati
        </button>

        <button
          onClick={() => setActiveTab("INVENTORY")}
          className={`flex-1 min-w-[150px] rounded-xl py-2.5 text-xs font-bold transition-all ${
            activeTab === "INVENTORY"
              ? "bg-[#16A34A] text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Ombor & Muddat Nazorati
        </button>
      </div>

      {/* TAB 1: ANALYTICS TABLE (TAHLILLAR) */}
      {activeTab === "ANALYTICS" && (
        <div className="space-y-6 animate-in fade-in">
          {/* Top Summary Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 no-print">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Tahlil Qilingan Savdo
              </span>
              <p className="mt-2 text-2xl font-extrabold text-slate-900">
                {formatCurrency(totalAnalyticsRevenue)}
              </p>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Jami {totalAnalyticsQty} birlik dori vositasi
              </span>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-sm">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">
                Hisoblangan Sof Foyda
              </span>
              <p className="mt-2 text-2xl font-extrabold text-[#16A34A]">
                {formatCurrency(totalAnalyticsProfit)}
              </p>
              <span className="text-[11px] text-emerald-600 mt-1 block">
                Savdo marjasi: {totalAnalyticsRevenue > 0 ? ((totalAnalyticsProfit / totalAnalyticsRevenue) * 100).toFixed(1) : 0}%
              </span>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Faol Dori Turlari
              </span>
              <p className="mt-2 text-2xl font-extrabold text-slate-900">
                {filteredAnalytics.length} ta
              </p>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Realizatsiya qilingan dori turlari
              </span>
            </div>
          </div>

          {/* Table Container with Controls & Printable Area */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden" id="printable-report">
            {/* PRINT-ONLY HEADER (Hidden on screen, visible only when printing A4) */}
            <div className="hidden print:block p-4 border-b-2 border-slate-900 mb-4">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-xl font-bold uppercase text-slate-900 tracking-wide">
                    {pharmacy.name}
                  </h1>
                  {pharmacy.address && (
                    <p className="text-xs text-slate-600 mt-0.5">{pharmacy.address}</p>
                  )}
                  {pharmacy.phone && (
                    <p className="text-xs text-slate-600">Tel: {pharmacy.phone}</p>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-xs font-semibold text-slate-700">
                    Sana: {new Date().toLocaleDateString("uz-UZ")}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Vaqt: {new Date().toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>

              <div className="mt-4 text-center border-t border-slate-300 pt-2">
                <h2 className="text-base font-extrabold uppercase text-slate-900">
                  DORI VOSITALARI SAVDOSI VA FOYDA TAHLILI HISOBOTI
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  Davr: Shu oy bo‘yicha realizatsiya va ombor tahlili
                </p>
              </div>

              {/* Print Summary Metrics Bar */}
              <div className="mt-3 grid grid-cols-3 border border-slate-300 rounded p-2 text-center text-xs">
                <div>
                  <span className="font-semibold text-slate-600">Jami Savdo: </span>
                  <span className="font-bold text-slate-900">{formatCurrency(totalAnalyticsRevenue)}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-600">Sof Foyda: </span>
                  <span className="font-bold text-slate-900">{formatCurrency(totalAnalyticsProfit)}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-600">Dorilar Soni: </span>
                  <span className="font-bold text-slate-900">{filteredAnalytics.length} xil</span>
                </div>
              </div>
            </div>

            {/* SCREEN-ONLY TOOLBAR WITH PROPERLY PLACED PRINT BUTTON */}
            <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-slate-50/50 no-print">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Dori Vositalari Realizatsiyasi va Foyda Tahlili
                </h3>
                <p className="text-xs text-slate-500">
                  Savdo aylanmasi, sotilgan miqdorlar va ombordagi mavjud qoldiq
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Search Bar */}
                <div className="relative min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Qidirish (nomi, shtrix-kod)..."
                    className="w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-[#16A34A] focus:outline-none"
                  />
                </div>

                {/* Sort selector */}
                <select
                  value={sortBy}
                  onChange={(e: any) => setSortBy(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:border-[#16A34A] focus:outline-none"
                >
                  <option value="revenue">Tushum bo‘yicha</option>
                  <option value="quantity">Miqdor bo‘yicha</option>
                  <option value="profit">Sof foyda bo‘yicha</option>
                </select>

                {/* PROPERLY PLACED A4 PRINT BUTTON */}
                <button
                  type="button"
                  onClick={handlePrintReport}
                  className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-slate-800 transition-colors shadow-sm"
                  title="A4 qog‘ozga tahlil jadvalini chop etish"
                >
                  <Printer className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Chop Etish (A4)</span>
                </button>
              </div>
            </div>

            {/* Analysis Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600 print:bg-slate-100 print:text-black">
                  <tr>
                    <th className="px-4 py-3 text-center w-10">№</th>
                    <th className="px-4 py-3">Dori Nomi</th>
                    <th className="px-3 py-3">Kategoriya</th>
                    <th className="px-3 py-3 font-mono">Shtrix-kod</th>
                    <th className="px-3 py-3 text-right">Sotuv Narxi</th>
                    <th className="px-3 py-3 text-center">Sotilgan</th>
                    <th className="px-3 py-3 text-right">Jami Tushum</th>
                    <th className="px-3 py-3 text-right">Sof Foyda</th>
                    <th className="px-4 py-3 text-center">Ombor Qoldig‘i</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 print:divide-slate-300">
                  {isLoading ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-xs text-slate-400">
                        Ma'lumotlar yuklanmoqda...
                      </td>
                    </tr>
                  ) : filteredAnalytics.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-xs text-slate-400">
                        Ushbu davrda realizatsiya qilingan dorilar topilmadi.
                      </td>
                    </tr>
                  ) : (
                    filteredAnalytics.map((item: any, idx: number) => {
                      const isLowStock = item.currentStock <= 5;
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors print:hover:bg-white">
                          <td className="px-4 py-2.5 text-center font-bold text-slate-400 print:text-black">
                            {idx + 1}
                          </td>
                          <td className="px-4 py-2.5 font-bold text-slate-900 print:text-black">
                            {item.name}
                          </td>
                          <td className="px-3 py-2.5 text-slate-600 print:text-black">
                            {item.categoryName}
                          </td>
                          <td className="px-3 py-2.5 font-mono text-[11px] text-slate-500 print:text-black">
                            {item.barcode}
                          </td>
                          <td className="px-3 py-2.5 text-right font-medium text-slate-800 print:text-black">
                            {formatCurrency(item.salePrice)}
                          </td>
                          <td className="px-3 py-2.5 text-center font-bold text-slate-900 print:text-black">
                            {item.totalQuantity} {item.unit}
                          </td>
                          <td className="px-3 py-2.5 text-right font-extrabold text-slate-900 print:text-black">
                            {formatCurrency(item.totalRevenue)}
                          </td>
                          <td className="px-3 py-2.5 text-right font-bold text-emerald-700 print:text-black">
                            {formatCurrency(item.totalProfit)}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border print:border-none print:p-0 ${
                                isLowStock
                                  ? "bg-amber-50 text-amber-800 border-amber-200"
                                  : "bg-slate-100 text-slate-700 border-slate-200"
                              }`}
                            >
                              {item.currentStock} {item.unit}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>

                {/* Table Footer with Totals (repeated or at end of table) */}
                {filteredAnalytics.length > 0 && (
                  <tfoot className="border-t-2 border-slate-300 bg-slate-50 font-bold text-slate-900 print:bg-slate-100">
                    <tr>
                      <td colSpan={5} className="px-4 py-3 text-right uppercase text-[11px] tracking-wider">
                        JAMI YIG‘INDI:
                      </td>
                      <td className="px-3 py-3 text-center">
                        {totalAnalyticsQty} dona
                      </td>
                      <td className="px-3 py-3 text-right font-extrabold text-emerald-800 print:text-black">
                        {formatCurrency(totalAnalyticsRevenue)}
                      </td>
                      <td className="px-3 py-3 text-right font-extrabold text-emerald-700 print:text-black">
                        {formatCurrency(totalAnalyticsProfit)}
                      </td>
                      <td className="px-4 py-3 text-center text-slate-500">
                        {filteredAnalytics.length} tur
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* PRINT-ONLY FOOTER SIGNATURES */}
            <div className="hidden print:flex justify-between items-end p-6 pt-12 text-xs text-slate-800">
              <div>
                <p>Hisobot tuzuvchi: _______________________ (imzo)</p>
                <p className="text-[10px] text-slate-500 mt-1">Sana: {new Date().toLocaleDateString("uz-UZ")}</p>
              </div>
              <div className="text-right">
                <p>Dorixona mudiri / Administrator: _______________________ (imzo)</p>
                <p className="text-[10px] text-slate-500 mt-1">M.O‘. (Muhr o‘rni)</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DAILY REPORT */}
      {activeTab === "DAILY" && (
        <div className="space-y-6 animate-in fade-in">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Bugungi Tushum
              </span>
              <p className="mt-2 text-2xl font-extrabold text-[#16A34A]">
                {formatCurrency(today.revenue)}
              </p>
              <span className="text-[11px] text-slate-400 mt-1 block">Xaridorlar to‘lagan summa</span>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Sotuvlar Soni
              </span>
              <p className="mt-2 text-2xl font-extrabold text-slate-900">
                {today.salesCount} ta chek
              </p>
              <span className="text-[11px] text-slate-400 mt-1 block">Muvaffaqiyatli xaridlar</span>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Sof Foyda
              </span>
              <p className="mt-2 text-2xl font-extrabold text-emerald-700">
                {formatCurrency(today.profit)}
              </p>
              <span className="text-[11px] text-slate-400 mt-1 block">Xarid narxidan ortiqcha summa</span>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Chegirmalar
              </span>
              <p className="mt-2 text-2xl font-extrabold text-red-600">
                {formatCurrency(today.discountTotal)}
              </p>
              <span className="text-[11px] text-slate-400 mt-1 block">Berilgan chegirma</span>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                QQS (Soliq)
              </span>
              <p className="mt-2 text-2xl font-extrabold text-blue-700">
                {formatCurrency(today.taxTotal)}
              </p>
              <span className="text-[11px] text-slate-400 mt-1 block">Bugungi cheklardan</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MONTHLY REPORT & TOP MEDICINES */}
      {activeTab === "MONTHLY" && (
        <div className="space-y-6 animate-in fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Oylik Jami Savdo
              </span>
              <p className="mt-2 text-2xl font-extrabold text-slate-900">
                {formatCurrency(month.revenue)}
              </p>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Jami {month.salesCount} ta sotuv
              </span>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Oylik Sof Foyda
              </span>
              <p className="mt-2 text-2xl font-extrabold text-emerald-700">
                {formatCurrency(month.profit)}
              </p>
              <span className="text-[11px] text-slate-400 mt-1 block">Dori marjasi hisobidan</span>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                O‘rtacha Chek Qiymati
              </span>
              <p className="mt-2 text-2xl font-extrabold text-blue-700">
                {formatCurrency(month.salesCount > 0 ? month.revenue / month.salesCount : 0)}
              </p>
              <span className="text-[11px] text-slate-400 mt-1 block">Bitta xaridga to‘g‘ri kelgan</span>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Oylik QQS (Soliq)
              </span>
              <p className="mt-2 text-2xl font-extrabold text-blue-700">
                {formatCurrency(month.taxTotal)}
              </p>
              <span className="text-[11px] text-slate-400 mt-1 block">Real cheklar asosida</span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-4">
              Ushbu Oyda Eng Ko‘p Sotilgan Dori Vositalari
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3">№</th>
                    <th className="px-4 py-3">Dori Nomi</th>
                    <th className="px-4 py-3">Sotilgan Miqdor</th>
                    <th className="px-4 py-3 text-right">Jami Tushum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {topMedicines.map((m: any, idx: number) => (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-bold text-slate-500">{idx + 1}</td>
                      <td className="px-4 py-3 font-bold text-slate-900">{m.name}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        {m.totalQuantity} {m.unit}
                      </td>
                      <td className="px-4 py-3 text-right font-extrabold text-emerald-700">
                        {formatCurrency(m.totalRevenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: CASHIER PERFORMANCE */}
      {activeTab === "CASHIERS" && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden animate-in fade-in">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">Kassir F.I.SH</th>
                  <th className="px-4 py-3.5">Logini</th>
                  <th className="px-4 py-3.5">Sotuvlar Soni</th>
                  <th className="px-4 py-3.5">Sotilgan Tovarlar</th>
                  <th className="px-5 py-3.5 text-right">Umumiy Tushum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cashiersStats.map((c: any) => (
                  <tr key={c.cashierId} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-slate-900 text-sm">{c.fullName}</td>
                    <td className="px-4 py-3.5 font-mono text-slate-500">{c.username}</td>
                    <td className="px-4 py-3.5 font-bold text-slate-800">{c.salesCount} ta</td>
                    <td className="px-4 py-3.5 text-slate-600">{c.totalItemsSold} dona</td>
                    <td className="px-5 py-3.5 text-right font-extrabold text-emerald-700 text-sm">
                      {formatCurrency(c.totalRevenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: INVENTORY HEALTH */}
      {activeTab === "INVENTORY" && (
        <div className="space-y-6 animate-in fade-in">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Jami Dori Turlari
              </span>
              <p className="mt-2 text-2xl font-extrabold text-slate-900">
                {inventory.totalMedicinesCount} ta
              </p>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
              <span className="text-xs font-bold text-amber-800 uppercase tracking-wider block">
                Kam Qolganlar
              </span>
              <p className="mt-2 text-2xl font-extrabold text-amber-700">
                {inventory.lowStockCount} ta
              </p>
            </div>

            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
              <span className="text-xs font-bold text-blue-800 uppercase tracking-wider block">
                Muddati Yaqinlashgan
              </span>
              <p className="mt-2 text-2xl font-extrabold text-blue-700">
                {inventory.approachingExpiryCount} ta
              </p>
            </div>

            <div className="rounded-2xl border border-red-200 bg-red-50 p-5 shadow-sm">
              <span className="text-xs font-bold text-red-800 uppercase tracking-wider block">
                Muddati O‘tgan
              </span>
              <p className="mt-2 text-2xl font-extrabold text-red-600">
                {inventory.expiredCount} ta
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
