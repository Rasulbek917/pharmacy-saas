"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { RotateCcw, Search, RefreshCw, AlertCircle } from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/formatters";

export default function AdminReturnsPage() {
  const [returns, setReturns] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadReturns();
  }, []);

  const loadReturns = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/returns");
      const data = await res.json();
      if (data.success) {
        setReturns(data.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = returns.filter((r) => {
    return (
      r.receiptNumber.toLowerCase().includes(search.toLowerCase()) ||
      (r.returnedBy && r.returnedBy.fullName.toLowerCase().includes(search.toLowerCase())) ||
      (r.reason && r.reason.toLowerCase().includes(search.toLowerCase()))
    );
  });

  const totalRefundAmount = returns.reduce((sum, r) => sum + r.totalRefundAmount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">
            Qaytarilgan Mahsulotlar Tarixi
          </h2>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Mijozlar tomonidan qaytarilgan dorilar va qaytarilgan pullar hisobi
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-red-800">
            <span>Jami qaytarilgan summa: </span>
            <span className="text-sm font-extrabold">{formatCurrency(totalRefundAmount)}</span>
          </div>

          <button
            onClick={loadReturns}
            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50"
            title="Yangilash"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <Search className="h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Chek raqami, xodim yoki sabab bo‘yicha qidirish..."
          className="w-full text-xs md:text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3.5">Chek Raqami</th>
                <th className="px-4 py-3.5">Sana va Vaqt</th>
                <th className="px-4 py-3.5">Qabul Qilgan Xodim</th>
                <th className="px-4 py-3.5">Qaytarilgan Dorilar</th>
                <th className="px-4 py-3.5">Qaytarish Sababi</th>
                <th className="px-5 py-3.5 text-right">Qaytarilgan Summa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-slate-400">
                    Yuklanmoqda...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-slate-400">
                    Qaytarish yozuvlari mavjud emas.
                  </td>
                </tr>
              ) : (
                filtered.map((ret) => (
                  <tr key={ret.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5 font-mono font-bold text-slate-900">
                      {ret.receiptNumber}
                    </td>

                    <td className="px-4 py-3.5 text-slate-500 font-medium">
                      {formatDateTime(ret.createdAt)}
                    </td>

                    <td className="px-4 py-3.5 font-semibold text-slate-800">
                      {ret.returnedBy?.fullName || "Xodim"}
                    </td>

                    <td className="px-4 py-3.5 text-slate-700">
                      {(ret.items || []).map((it: any, idx: number) => (
                        <span key={idx} className="block text-[11px]">
                          • {it.medicine?.name} ({it.quantity} dona)
                        </span>
                      ))}
                    </td>

                    <td className="px-4 py-3.5 text-slate-600 italic">
                      {ret.reason || "Kiritilmagan"}
                    </td>

                    <td className="px-5 py-3.5 text-right font-extrabold text-red-600 text-sm">
                      -{formatCurrency(ret.totalRefundAmount)}
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
