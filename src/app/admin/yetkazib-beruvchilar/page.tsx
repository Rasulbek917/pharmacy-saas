"use client";

import React, { useState, useEffect } from "react";
import {
  Truck,
  Plus,
  Search,
  CheckCircle,
  X,
  CreditCard,
  Phone,
  MapPin,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { formatCurrency } from "@/lib/formatters";

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  // Pay debt modal
  const [payingSupplier, setPayingSupplier] = useState<any | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [isProcessingPay, setIsProcessingPay] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    phone: "+998 ",
    address: "",
    contactPerson: "",
    debt: 0,
    notes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/suppliers");
      const data = await res.json();
      if (data.success) {
        setSuppliers(data.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || "Xatolik yuz berdi");
        setIsSubmitting(false);
        return;
      }

      setSuccessMsg(data.message);
      setShowAddModal(false);
      setFormData({
        name: "",
        phone: "+998 ",
        address: "",
        contactPerson: "",
        debt: 0,
        notes: "",
      });
      loadSuppliers();
    } catch (e) {
      setErrorMsg("Server xatosi");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePayDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingSupplier || payAmount <= 0) return;

    setIsProcessingPay(true);
    try {
      const res = await fetch(`/api/suppliers/${payingSupplier.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payDebtAmount: Number(payAmount) }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "Xatolik yuz berdi");
      } else {
        alert(data.message);
        setPayingSupplier(null);
        setPayAmount(0);
        loadSuppliers();
      }
    } catch (e) {
      alert("Server xatosi");
    } finally {
      setIsProcessingPay(false);
    }
  };

  const filtered = suppliers.filter((s) => {
    return (
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.contactPerson && s.contactPerson.toLowerCase().includes(search.toLowerCase())) ||
      (s.phone && s.phone.includes(search))
    );
  });

  const totalDebts = suppliers.reduce((sum, s) => sum + s.debt, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">
            Yetkazib Beruvchilar va Qarzdorlik
          </h2>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Dori ta'minotchilari, umumiy xaridlar va qarzlar nazorati
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-red-800">
            <span>Jami Qarzdorlik: </span>
            <span className="text-sm font-extrabold">{formatCurrency(totalDebts)}</span>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 rounded-xl bg-[#16A34A] px-4 py-2.5 text-xs md:text-sm font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-[#15803D]"
          >
            <Plus className="h-4 w-4" />
            <span>Ta'minotchi Qo‘shish</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)}>×</button>
        </div>
      )}

      {/* Search */}
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <Search className="h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Ta'minotchi nomi, kontakt shaxs yoki telefon bo‘yicha qidirish..."
          className="w-full text-xs md:text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
        />
      </div>

      {/* Suppliers Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3.5">Ta'minotchi Nomi</th>
                <th className="px-4 py-3.5">Kontakt Shaxs & Tel</th>
                <th className="px-4 py-3.5">Manzil</th>
                <th className="px-4 py-3.5">Jami Xaridlar</th>
                <th className="px-4 py-3.5">To‘langan Summa</th>
                <th className="px-4 py-3.5">Qolgan Qarz</th>
                <th className="px-5 py-3.5 text-right">Qarz To‘lovi</th>
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
                    Yetkazib beruvchilar mavjud emas.
                  </td>
                </tr>
              ) : (
                filtered.map((sup) => (
                  <tr key={sup.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-slate-900 text-sm">
                      {sup.name}
                      <span className="block text-[11px] font-normal text-slate-400">
                        {sup._count?.batches || 0} ta partiya keltirilgan
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="font-semibold text-slate-800">
                        {sup.contactPerson || "Biriktirilmagan"}
                      </span>
                      <span className="block text-[11px] text-slate-500">{sup.phone || "-"}</span>
                    </td>

                    <td className="px-4 py-3.5 text-slate-600">{sup.address || "-"}</td>

                    <td className="px-4 py-3.5 font-semibold text-slate-900">
                      {formatCurrency(sup.totalPurchases)}
                    </td>

                    <td className="px-4 py-3.5 font-semibold text-emerald-700">
                      {formatCurrency(sup.totalPaid)}
                    </td>

                    <td className="px-4 py-3.5">
                      <span
                        className={`font-extrabold text-sm ${
                          sup.debt > 0 ? "text-red-600" : "text-slate-400"
                        }`}
                      >
                        {formatCurrency(sup.debt)}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      {sup.debt > 0 ? (
                        <button
                          onClick={() => {
                            setPayingSupplier(sup);
                            setPayAmount(sup.debt);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition-colors"
                        >
                          <CreditCard className="h-3 w-3" />
                          <span>Qarzni To‘lash</span>
                        </button>
                      ) : (
                        <span className="text-[11px] font-semibold text-emerald-600">
                          Qarz yo‘q ✓
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pay Debt Modal */}
      {payingSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-sm rounded-2xl bg-white shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Qarz To‘lovini Qayd Etish</h3>
              <button onClick={() => setPayingSupplier(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="text-xs text-slate-600 space-y-1">
              <p>
                Ta'minotchi: <strong className="text-slate-900">{payingSupplier.name}</strong>
              </p>
              <p>
                Joriy qarz: <strong className="text-red-600">{formatCurrency(payingSupplier.debt)}</strong>
              </p>
            </div>

            <form onSubmit={handlePayDebt} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  To‘lanayotgan Summa (so‘m) *
                </label>
                <input
                  type="number"
                  min="1000"
                  max={payingSupplier.debt}
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value) || 0)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm font-bold text-emerald-700 focus:border-[#16A34A] focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPayingSupplier(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={isProcessingPay}
                  className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {isProcessingPay ? "Saqlanmoqda..." : "To‘lovni Saqlash"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Supplier Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Yangi Ta'minotchi Qo‘shish</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3">
              {errorMsg && (
                <div className="rounded-xl bg-red-50 p-2.5 text-xs text-red-700 font-medium">
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700">Ta'minotchi Nomi *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Masalan: Jurabek Laboratories MChJ"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs md:text-sm focus:border-[#16A34A] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Telefon Raqami</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+998 71 123 45 67"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs md:text-sm focus:border-[#16A34A] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Kontakt Shaxs</label>
                <input
                  type="text"
                  value={formData.contactPerson}
                  onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                  placeholder="Farhod aka"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs md:text-sm focus:border-[#16A34A] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Manzil</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Toshkent sh., Olmazor tumani"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs md:text-sm focus:border-[#16A34A] focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-[#16A34A] px-5 py-2 text-xs font-bold text-white hover:bg-[#15803D] disabled:opacity-50"
                >
                  {isSubmitting ? "Saqlanmoqda..." : "Saqlash"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
