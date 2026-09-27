"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Boxes,
  ArrowDownToLine,
  CalendarClock,
  Pill,
  AlertTriangle,
  Clock,
  Plus,
  RefreshCw,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";

export default function OmborchiDashboard() {
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

  const inventory = reports?.inventory || {
    totalMedicinesCount: 0,
    lowStockCount: 0,
    approachingExpiryCount: 0,
    expiredCount: 0,
    lowStockMedicines: [],
    approachingBatches: [],
    expiredBatches: [],
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">
            Omborchi Boshqaruv Paneli
          </h2>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Dori vositalarini kirim qilish, partiyalar va yaroqlilik muddatlari nazorati
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/omborchi/kirim"
            className="flex items-center gap-2 rounded-xl bg-[#16A34A] px-4 py-2.5 text-xs md:text-sm font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-[#15803D] transition-colors"
          >
            <ArrowDownToLine className="h-4 w-4" />
            <span>Tezkor Kirim Qilish</span>
          </Link>
        </div>
      </div>

      {/* 4 Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Jami Dorilar
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <Pill className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-extrabold text-slate-900">
            {inventory.totalMedicinesCount} ta
          </p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Katalogdagi faol turlar</span>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">
              Kam Qolganlar
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-extrabold text-amber-700">
            {inventory.lowStockCount} ta
          </p>
          <span className="text-[11px] text-amber-600 mt-0.5 block">Buyurtma berish tavsiya etiladi</span>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-800 uppercase tracking-wider">
              Muddati Yaqinlashgan
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-extrabold text-blue-700">
            {inventory.approachingExpiryCount} ta
          </p>
          <span className="text-[11px] text-blue-600 mt-0.5 block">90 kun ichida tugaydi</span>
        </div>

        <div className="rounded-2xl border border-red-200 bg-red-50/60 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-red-800 uppercase tracking-wider">
              Muddati O‘tgan
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-100 text-red-700">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-extrabold text-red-700">
            {inventory.expiredCount} ta
          </p>
          <span className="text-[11px] text-red-600 mt-0.5 block">Sotish qat’iyan bloklangan</span>
        </div>
      </div>

      {/* Two columns: Approaching Expiry & Low Stock lists */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Approaching Expiry */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-600" />
              Yaroqlilik Muddati Yaqin Partiyalar (FEFO)
            </h3>
            <Link
              href="/omborchi/partiyalar"
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800"
            >
              Hammasi
            </Link>
          </div>

          <div className="mt-4 divide-y divide-slate-100">
            {inventory.approachingBatches.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-400">
                Muddati yaqinlashayotgan partiyalar mavjud emas.
              </p>
            ) : (
              inventory.approachingBatches.map((b: any) => (
                <div key={b.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-slate-800">{b.medicineName}</p>
                    <p className="text-[11px] text-slate-500">
                      Partiya #{b.batchNumber} • Qoldiq: {b.quantity} dona
                    </p>
                  </div>
                  <span className="rounded-lg bg-amber-50 px-2.5 py-1 font-bold text-amber-800 border border-amber-200">
                    {formatDate(b.expiryDate)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Low Stock Medicines */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Kam Qolgan Dori Vositalari
            </h3>
            <Link
              href="/admin/ombor"
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800"
            >
              Omborni ko‘rish
            </Link>
          </div>

          <div className="mt-4 divide-y divide-slate-100">
            {inventory.lowStockMedicines.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-400">
                Barcha dorilar qoldig‘i yetarli darajada.
              </p>
            ) : (
              inventory.lowStockMedicines.map((m: any) => (
                <div key={m.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-slate-800">{m.name}</p>
                    <p className="text-[11px] text-slate-500">
                      Minimal chegara: {m.minStock} {m.unit}
                    </p>
                  </div>
                  <span className="rounded-lg bg-red-50 px-2.5 py-1 font-bold text-red-700 border border-red-200">
                    Qoldi: {m.currentStock} {m.unit}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
