"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { CalendarClock, Search, ArrowDownToLine, RefreshCw, AlertTriangle } from "lucide-react";
import { formatCurrency, formatDate, EXPIRY_WARNING_DAYS } from "@/lib/formatters";

export default function PartiyalarPage() {
  const [batches, setBatches] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  useEffect(() => {
    loadBatches();
  }, [statusFilter]);

  const loadBatches = async () => {
    setIsLoading(true);
    try {
      const url =
        statusFilter === "ALL"
          ? "/api/inventory/batches"
          : `/api/inventory/batches?status=${statusFilter}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setBatches(data.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = batches.filter((b) => {
    return (
      b.batchNumber.toLowerCase().includes(search.toLowerCase()) ||
      b.medicine.name.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">
            Partiyalar va Yaroqlilik Muddati (FEFO)
          </h2>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Yaroqlilik muddati eng yaqin partiyalar birinchi sotuvga chiqariladi
          </p>
        </div>

        <Link
          href="/omborchi/kirim"
          className="flex items-center gap-2 rounded-xl bg-[#16A34A] px-4 py-2 text-xs md:text-sm font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-[#15803D]"
        >
          <ArrowDownToLine className="h-4 w-4" />
          <span>Yangi Partiya Kirim Qilish</span>
        </Link>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Dori nomi yoki partiya raqami bo‘yicha qidirish..."
            className="w-full rounded-xl border border-slate-300 pl-10 pr-4 py-2 text-xs md:text-sm text-slate-800 placeholder-slate-400 focus:border-[#16A34A] focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 focus:border-[#16A34A] focus:outline-none"
          >
            <option value="ALL">Barcha partiyalar</option>
            <option value="NORMAL">Normal holatdagilar</option>
            <option value="APPROACHING">Muddati yaqinlashayotganlar</option>
            <option value="EXPIRED">Muddati o‘tganlar</option>
          </select>

          <button
            onClick={loadBatches}
            className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-600 hover:bg-slate-100"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Batches Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3.5">Dori Nomi</th>
                <th className="px-4 py-3.5">Partiya Raqami</th>
                <th className="px-4 py-3.5">Mavjud Qoldiq</th>
                <th className="px-4 py-3.5">Yaroqlilik Muddati</th>
                <th className="px-4 py-3.5">Qolgan Muddat</th>
                <th className="px-4 py-3.5">Holati</th>
                <th className="px-5 py-3.5">Yetkazib Beruvchi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-slate-400">
                    Yuklanmoqda...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-slate-400">
                    Partiyalar topilmadi.
                  </td>
                </tr>
              ) : (
                filtered.map((batch) => (
                  <tr key={batch.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-slate-900">
                      {batch.medicine.name}
                    </td>

                    <td className="px-4 py-3.5 font-mono text-xs font-bold text-slate-700">
                      {batch.batchNumber}
                    </td>

                    <td className="px-4 py-3.5 font-extrabold text-slate-900">
                      {batch.currentQuantity} {batch.medicine.unit}
                    </td>

                    <td className="px-4 py-3.5 text-slate-700 font-semibold">
                      {formatDate(batch.expiryDate)}
                    </td>

                    <td className="px-4 py-3.5 font-medium">
                      {batch.daysLeft <= 0 ? (
                        <span className="text-red-600 font-bold">Muddati tugagan</span>
                      ) : batch.daysLeft <= EXPIRY_WARNING_DAYS ? (
                        <span className="text-amber-700 font-bold">{batch.daysLeft} kun qoldi</span>
                      ) : (
                        <span className="text-slate-600">{batch.daysLeft} kun</span>
                      )}
                    </td>

                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${batch.statusBadgeClass}`}
                      >
                        {batch.statusLabel}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 text-slate-600">
                      {batch.supplier?.name || "Kiritilmagan"}
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
