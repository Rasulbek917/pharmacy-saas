"use client";

import React, { useState, useEffect } from "react";
import { Receipt, Search, Eye, Printer, RefreshCw } from "lucide-react";
import { formatCurrency, formatDateTime, getPaymentMethodLabel } from "@/lib/formatters";
import ReceiptModal from "@/components/pos/ReceiptModal";

export default function KassirHistoryPage() {
  const [sales, setSales] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  useEffect(() => {
    loadSales();
  }, []);

  const loadSales = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/sales");
      const data = await res.json();
      if (data.success) {
        setSales(data.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewReceipt = async (sale: any) => {
    try {
      // Log reprint in audit logs
      await fetch(`/api/sales/${sale.id}/reprint`, { method: "POST" });
    } catch (e) {
      // Ignore network failure
    }

    setSelectedReceipt({
      receiptNumber: sale.receiptNumber,
      pharmacyName: "Dorixona",
      cashierName: sale.cashier?.fullName || "Kassir",
      createdAt: sale.createdAt,
      totalAmount: sale.totalAmount,
      discountAmount: sale.discountAmount,
      payableAmount: sale.payableAmount,
      paidAmount: sale.paidAmount,
      changeAmount: sale.changeAmount,
      paymentMethod: sale.paymentMethod,
      items: (sale.items || []).map((i: any) => ({
        medicineName: i.medicine?.name || "Dori",
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        discount: i.discount,
        totalPrice: i.totalPrice,
      })),
    });
    setShowReceiptModal(true);
  };

  const filteredSales = sales.filter((s) => {
    return (
      s.receiptNumber.toLowerCase().includes(search.toLowerCase()) ||
      (s.customer && s.customer.name.toLowerCase().includes(search.toLowerCase()))
    );
  });

  const totalRevenue = sales.reduce((acc, s) => acc + s.payableAmount, 0);

  return (
    <div className="space-y-6">
      <ReceiptModal
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        receipt={selectedReceipt}
        isReprint={true}
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">
            Mening Sotuvlarim Tarixi
          </h2>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Siz amalga oshirgan barcha cheklar va sotuvlar ro‘yxati
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-800">
            <span>Jami sotuv tushumi: </span>
            <span className="text-sm font-extrabold">{formatCurrency(totalRevenue)}</span>
          </div>

          <button
            onClick={loadSales}
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
          placeholder="Chek raqami yoki xaridor ismi bo‘yicha qidirish..."
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
                <th className="px-4 py-3.5">Xaridor</th>
                <th className="px-4 py-3.5">Mahsulotlar</th>
                <th className="px-4 py-3.5">To‘lov Turi</th>
                <th className="px-4 py-3.5">Chegirma</th>
                <th className="px-4 py-3.5">Jami Summa</th>
                <th className="px-5 py-3.5 text-right">Chek</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs text-slate-400">
                    Yuklanmoqda...
                  </td>
                </tr>
              ) : filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs text-slate-400">
                    Sotuvlar topilmadi.
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5 font-mono font-bold text-slate-900">
                      {sale.receiptNumber}
                    </td>

                    <td className="px-4 py-3.5 text-slate-500 font-medium">
                      {formatDateTime(sale.createdAt)}
                    </td>

                    <td className="px-4 py-3.5 font-medium text-slate-700">
                      {sale.customer?.name || "Oddiy xaridor"}
                    </td>

                    <td className="px-4 py-3.5 text-slate-600">
                      {sale.items?.length || 0} turdagi tovar
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="rounded-lg bg-slate-100 px-2 py-0.5 font-semibold text-[11px] text-slate-700">
                        {getPaymentMethodLabel(sale.paymentMethod)}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-red-600 font-medium">
                      {sale.discountAmount > 0 ? `-${formatCurrency(sale.discountAmount)}` : "-"}
                    </td>

                    <td className="px-4 py-3.5 font-extrabold text-emerald-700 text-sm">
                      {formatCurrency(sale.payableAmount)}
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => handleViewReceipt(sale)}
                        className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 hover:bg-slate-200 transition-colors"
                        title="Chekni ko'rish va chop etish"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Chek</span>
                      </button>
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
