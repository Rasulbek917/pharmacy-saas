"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Boxes,
  Plus,
  Search,
  Filter,
  ArrowDownToLine,
  RefreshCw,
  AlertTriangle,
  Clock,
  Pill,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";

export default function InventoryPage() {
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

  const filteredBatches = batches.filter((b) => {
    return (
      b.batchNumber.toLowerCase().includes(search.toLowerCase()) ||
      b.medicine.name.toLowerCase().includes(search.toLowerCase()) ||
      (b.medicine.barcode && b.medicine.barcode.includes(search))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">
            Ombor Qoldiqlari va Partiyalar (FEFO)
          </h2>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Partiyalar hisobi, yaroqlilik muddatlari nazorati va kirim-chiqimlar
          </p>
        </div>

        <Link
          href="/omborchi/kirim"
          className="flex items-center justify-center gap-2 rounded-xl bg-[#16A34A] px-4 py-2.5 text-xs md:text-sm font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-[#15803D] transition-colors"
        >
          <ArrowDownToLine className="h-4 w-4" />
          <span>Omborga Kirim Qilish</span>
        </Link>
      </div>

      {/* Filter and Search Bar */}
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
            <option value="NORMAL">Normal (Muddati yetarli)</option>
            <option value="APPROACHING">Yaqinlashmoqda (Ogohlantirish)</option>
            <option value="EXPIRED">Muddati tugagan (Bloklangan)</option>
          </select>

          <button
            onClick={loadBatches}
            className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-600 hover:bg-slate-100"
            title="Yangilash"
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
                <th className="px-5 py-3.5">Dori Vositasi</th>
                <th className="px-4 py-3.5">Partiya #</th>
                <th className="px-4 py-3.5">Mavjud Qoldiq</th>
                <th className="px-4 py-3.5">Kelish Narxi</th>
                <th className="px-4 py-3.5">Sotuv Narxi</th>
                <th className="px-4 py-3.5">Yaroqlilik Muddati</th>
                <th className="px-4 py-3.5">Holati</th>
                <th className="px-5 py-3.5">Yetkazib Beruvchi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs text-slate-400">
                    Yuklanmoqda...
                  </td>
                </tr>
              ) : filteredBatches.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs text-slate-400">
                    Partiyalar topilmadi.
                  </td>
                </tr>
              ) : (
                filteredBatches.map((batch) => (
                  <tr key={batch.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-slate-900">
                      {batch.medicine.name}
                      <span className="block text-[11px] font-normal text-slate-400">
                        {batch.medicine.barcode || "-"}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 font-mono text-[11px] font-bold text-slate-700">
                      {batch.batchNumber}
                    </td>

                    <td className="px-4 py-3.5">
                      <span
                        className={`font-extrabold text-sm ${
                          batch.currentQuantity === 0
                            ? "text-slate-400"
                            : batch.currentQuantity <= batch.medicine.minStock
                            ? "text-amber-700"
                            : "text-slate-900"
                        }`}
                      >
                        {batch.currentQuantity} {batch.medicine.unit}
                      </span>
                      <span className="block text-[10px] text-slate-400">
                        Boshlang‘ich: {batch.initialQuantity}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-slate-600">
                      {formatCurrency(batch.purchasePrice)}
                    </td>

                    <td className="px-4 py-3.5 font-bold text-emerald-700">
                      {formatCurrency(batch.salePrice)}
                    </td>

                    <td className="px-4 py-3.5 font-medium text-slate-800">
                      {formatDate(batch.expiryDate)}
                      <span className="block text-[10px] text-slate-400">
                        {batch.daysLeft > 0 ? `${batch.daysLeft} kun qoldi` : "Muddati o‘tgan"}
                      </span>
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
