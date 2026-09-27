"use client";

import React, { useState } from "react";
import { RotateCcw, Search, CheckCircle, AlertCircle, ShoppingBag } from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/formatters";

export default function ReturnsPage() {
  const [receiptNumber, setReceiptNumber] = useState("");
  const [sale, setSale] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [returnReason, setReturnReason] = useState("Mijoz xohishi bilan qaytarildi");
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSearchSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiptNumber.trim()) return;

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setSale(null);
    setSelectedItems({});

    try {
      const res = await fetch(`/api/sales`);
      const data = await res.json();
      if (data.success) {
        const found = (data.data || []).find(
          (s: any) => s.receiptNumber.toLowerCase() === receiptNumber.trim().toLowerCase()
        );

        if (!found) {
          setErrorMsg(`"${receiptNumber}" raqamli chek topilmadi!`);
        } else {
          setSale(found);
          // Default return quantity 0
          const initialMap: Record<string, number> = {};
          found.items.forEach((item: any) => {
            initialMap[item.id] = 0;
          });
          setSelectedItems(initialMap);
        }
      }
    } catch (err) {
      setErrorMsg("Qidiruvda xatolik yuz berdi");
    } finally {
      setIsLoading(false);
    }
  };

  const handleProcessReturn = async () => {
    const itemsToReturn = Object.entries(selectedItems)
      .filter(([_, qty]) => qty > 0)
      .map(([saleItemId, qty]) => {
        const saleItem = sale.items.find((i: any) => i.id === saleItemId);
        return {
          saleItemId,
          medicineId: saleItem.medicineId,
          batchId: saleItem.batchId,
          quantity: qty,
          refundUnitPrice: saleItem.unitPrice,
        };
      });

    if (itemsToReturn.length === 0) {
      alert("Iltimos, qaytariladigan tovar va uning miqdorini ko‘rsating!");
      return;
    }

    if (!confirm("Haqiqatan ham tanlangan tovarlarni omborga qaytarib, pulni xaridorga qaytarasizmi?")) {
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          saleId: sale.id,
          reason: returnReason,
          items: itemsToReturn,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || "Qaytarishda xatolik yuz berdi");
        setIsSubmitting(false);
        return;
      }

      setSuccessMsg(data.message);
      setSale(null);
      setReceiptNumber("");
      setSelectedItems({});
    } catch (e) {
      setErrorMsg("Server xatosi");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">
          Sotilgan Mahsulotni Qaytarish (Returns)
        </h2>
        <p className="text-xs md:text-sm text-slate-500 mt-1">
          Chek raqami orqali mahsulotlarni ombor qoldig‘iga qaytarish va to‘lovni qaytarish
        </p>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)}>×</button>
        </div>
      )}

      {/* Error Notification */}
      {errorMsg && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)}>×</button>
        </div>
      )}

      {/* Receipt Search Box */}
      <form onSubmit={handleSearchSale} className="flex gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={receiptNumber}
            onChange={(e) => setReceiptNumber(e.target.value)}
            placeholder="Chek raqamini kiriting (masalan: CHK-20260922-1001)..."
            className="w-full rounded-xl border border-slate-300 pl-10 pr-4 py-2.5 text-xs md:text-sm text-slate-800 font-mono focus:border-[#16A34A] focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="rounded-xl bg-[#16A34A] px-6 py-2.5 text-xs md:text-sm font-bold text-white shadow-md hover:bg-[#15803D] disabled:opacity-50"
        >
          {isLoading ? "Qidirilmoqda..." : "Chekni Topish"}
        </button>
      </form>

      {/* Found Sale Items for Return */}
      {sale && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Topilgan Chek
              </span>
              <h3 className="font-extrabold text-slate-900 text-base font-mono">
                {sale.receiptNumber}
              </h3>
              <p className="text-xs text-slate-500">
                Sana: {formatDateTime(sale.createdAt)} • Kassir: {sale.cashier?.fullName}
              </p>
            </div>

            <div className="text-right">
              <span className="text-xs text-slate-500">Chek bo‘yicha to‘lov:</span>
              <p className="text-lg font-extrabold text-emerald-700">
                {formatCurrency(sale.payableAmount)}
              </p>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Qaytariladigan tovarlar va miqdorni tanlang:
            </h4>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
              {sale.items.map((item: any) => {
                const currentQty = selectedItems[item.id] || 0;

                return (
                  <div
                    key={item.id}
                    className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-white hover:bg-slate-50"
                  >
                    <div>
                      <p className="font-bold text-slate-900">{item.medicine?.name}</p>
                      <span className="text-[11px] text-slate-500">
                        Partiya #{item.batch?.batchNumber} • Sotilgan narx: {formatCurrency(item.unitPrice)} •
                        Sotilgan miqdor: {item.quantity} dona
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <label className="text-slate-500 font-medium">Qaytarish miqdori:</label>
                        <input
                          type="number"
                          min="0"
                          max={item.quantity}
                          value={currentQty}
                          onChange={(e) => {
                            const val = Math.max(0, Math.min(item.quantity, Number(e.target.value) || 0));
                            setSelectedItems((prev) => ({ ...prev, [item.id]: val }));
                          }}
                          className="w-16 rounded-lg border border-slate-300 px-2 py-1 text-center font-bold text-slate-900 focus:border-[#16A34A] focus:outline-none"
                        />
                        <span className="text-slate-400">/ {item.quantity} dona</span>
                      </div>

                      <span className="font-extrabold text-slate-900 w-28 text-right">
                        {formatCurrency(currentQty * item.unitPrice)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Qaytarish sababi:
            </label>
            <input
              type="text"
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              placeholder="Masalan: Noto‘g‘ri o‘lcham yoki mijoz rad etdi"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs md:text-sm text-slate-800 focus:border-[#16A34A] focus:outline-none"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleProcessReturn}
              className="flex items-center gap-2 rounded-xl bg-red-600 px-6 py-2.5 text-xs md:text-sm font-bold text-white shadow-md hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              <span>{isSubmitting ? "Bajarilmoqda..." : "Omborga Qaytarish va Pulni To‘lash"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
