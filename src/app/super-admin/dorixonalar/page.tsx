"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  Building2,
  Plus,
  Search,
  Lock,
  Unlock,
  Trash2,
  Edit,
  Zap,
  CheckCircle,
  X,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { formatDate, getPharmacyStatusBadge } from "@/lib/formatters";

export default function PharmaciesPage() {
  const searchParams = useSearchParams();
  const [pharmacies, setPharmacies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  // Create modal state
  const [showCreateModal, setShowCreateModal] = useState(searchParams.get("yangi") === "1");
  const [createForm, setCreateForm] = useState({
    name: "",
    phone: "+998 ",
    address: "",
    adminName: "",
    adminUsername: "",
    adminPassword: "",
    trialDays: 7,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Edit modal state
  const [editingPharmacy, setEditingPharmacy] = useState<any | null>(null);

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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/pharmacies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.error || "Dorixonani qo‘shishda xatolik yuz berdi");
        setIsSubmitting(false);
        return;
      }

      setSuccessMessage("Yangi dorixona muvaffaqiyatli qo‘shildi va 7 kunlik trial boshlandi!");
      setShowCreateModal(false);
      setCreateForm({
        name: "",
        phone: "+998 ",
        address: "",
        adminName: "",
        adminUsername: "",
        adminPassword: "",
        trialDays: 7,
      });
      loadPharmacies();
    } catch (err) {
      setErrorMessage("Server bilan bog‘lanishda xatolik");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleBlock = async (pharmacy: any) => {
    const newStatus = pharmacy.status === "BLOCKED" ? "ACTIVE" : "BLOCKED";
    const confirmText =
      newStatus === "BLOCKED"
        ? `Haqiqatan ham "${pharmacy.name}" dorixonasini bloklamoqchimisiz?`
        : `"${pharmacy.name}" dorixonasini blokdan chiqarmoqchimisiz?`;

    if (!confirm(confirmText)) return;

    try {
      const res = await fetch(`/api/pharmacies/${pharmacy.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        loadPharmacies();
      } else {
        alert(data.error || "Xatolik yuz berdi");
      }
    } catch (e) {
      alert("Server xatosi");
    }
  };

  const handleActivateSubscription = async (pharmacy: any) => {
    if (!confirm(`"${pharmacy.name}" uchun 30 kunlik oylik obunani faollashtirib, holatini Aktiv qilmoqchimisiz?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/pharmacies/${pharmacy.id}/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ durationDays: 30, price: 350000 }),
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        loadPharmacies();
      } else {
        alert(data.error || "Xatolik yuz berdi");
      }
    } catch (e) {
      alert("Server xatosi");
    }
  };

  const handleDelete = async (pharmacy: any) => {
    if (!confirm(`DIQQAT: "${pharmacy.name}" dorixonasini o‘chirmoqchimisiz?`)) return;

    try {
      const res = await fetch(`/api/pharmacies/${pharmacy.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        loadPharmacies();
      }
    } catch (e) {
      alert("Server xatosi");
    }
  };

  const filteredPharmacies = pharmacies.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.adminName.toLowerCase().includes(search.toLowerCase()) ||
      p.phone.includes(search);

    if (filterStatus === "ALL") return matchesSearch;
    return matchesSearch && p.status === filterStatus;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">
            Dorixonalar Boshqaruvi
          </h2>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Yangi dorixonalar qo‘shish, obunalarni faollashtirish va bloklash
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center justify-center gap-2 rounded-xl bg-[#16A34A] px-4 py-2.5 text-xs md:text-sm font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-[#15803D] transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Yangi Dorixona Qo‘shish</span>
        </button>
      </div>

      {/* Success banner */}
      {successMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Dorixona nomi, admin yoki telefon bo‘yicha qidirish..."
            className="w-full rounded-xl border border-slate-300 pl-10 pr-4 py-2 text-xs md:text-sm text-slate-800 placeholder-slate-400 focus:border-[#16A34A] focus:outline-none focus:ring-1 focus:ring-[#16A34A]"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 focus:border-[#16A34A] focus:outline-none"
          >
            <option value="ALL">Barcha holatlar</option>
            <option value="ACTIVE">Aktiv</option>
            <option value="TRIAL">Sinov (Trial)</option>
            <option value="BLOCKED">Bloklangan</option>
          </select>

          <button
            onClick={loadPharmacies}
            className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-600 hover:bg-slate-100"
            title="Yangilash"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Pharmacies Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3.5">Dorixona</th>
                <th className="px-4 py-3.5">Admin & Telefon</th>
                <th className="px-4 py-3.5">Holati</th>
                <th className="px-4 py-3.5">Ro‘yxatdan o‘tgan</th>
                <th className="px-4 py-3.5">Obuna / Sinov</th>
                <th className="px-4 py-3.5">Statistika</th>
                <th className="px-5 py-3.5 text-right">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-slate-400">
                    Yuklanmoqda...
                  </td>
                </tr>
              ) : filteredPharmacies.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-slate-400">
                    Hech qanday dorixona topilmadi.
                  </td>
                </tr>
              ) : (
                filteredPharmacies.map((pharmacy) => {
                  const badge = getPharmacyStatusBadge(pharmacy.status);

                  return (
                    <tr key={pharmacy.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 font-bold">
                            <Building2 className="h-4 w-4" />
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 text-sm">{pharmacy.name}</span>
                            <span className="block text-[11px] text-slate-500">{pharmacy.address}</span>
                          </div>
                        </div>
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

                      <td className="px-4 py-3.5 text-slate-500 text-[11px]">
                        {formatDate(pharmacy.createdAt)}
                      </td>

                      <td className="px-4 py-3.5 text-[11px]">
                        {pharmacy.status === "TRIAL" ? (
                          <div className="text-blue-700">
                            <span className="font-bold">Sinov (Trial)</span>
                            <span className="block text-slate-500">
                              Qolgan: {pharmacy.daysRemaining} kun
                            </span>
                          </div>
                        ) : pharmacy.status === "ACTIVE" ? (
                          <div className="text-emerald-700">
                            <span className="font-bold">Oylik Obuna</span>
                            <span className="block text-slate-500">
                              Qolgan: {pharmacy.daysRemaining} kun
                            </span>
                          </div>
                        ) : (
                          <span className="font-bold text-red-600">Bloklangan</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-[11px] text-slate-600">
                        <span>Dorilar: {pharmacy._count?.medicines || 0} ta</span>
                        <span className="block">Sotuvlar: {pharmacy._count?.sales || 0} ta</span>
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Activate Button */}
                          <button
                            onClick={() => handleActivateSubscription(pharmacy)}
                            className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition-colors"
                            title="Obunani faollashtirish (30 kun)"
                          >
                            <Zap className="h-3 w-3" />
                            <span>Faollashtirish</span>
                          </button>

                          {/* Block / Unblock */}
                          <button
                            onClick={() => handleToggleBlock(pharmacy)}
                            className={`rounded-lg p-1.5 transition-colors ${
                              pharmacy.status === "BLOCKED"
                                ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                : "bg-amber-50 text-amber-700 hover:bg-amber-100"
                            }`}
                            title={pharmacy.status === "BLOCKED" ? "Blokdan chiqarish" : "Bloklash"}
                          >
                            {pharmacy.status === "BLOCKED" ? (
                              <Unlock className="h-4 w-4" />
                            ) : (
                              <Lock className="h-4 w-4" />
                            )}
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDelete(pharmacy)}
                            className="rounded-lg p-1.5 bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                            title="O‘chirish"
                          >
                            <Trash2 className="h-4 w-4" />
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

      {/* CREATE PHARMACY MODAL (Section 6 & 7) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">Yangi Dorixona Qo‘shish</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {errorMessage && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Dorixona Nomi *
                </label>
                <input
                  type="text"
                  required
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="Masalan: SHIFO NUR DORIXONA"
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs md:text-sm text-slate-800 focus:border-[#16A34A] focus:outline-none focus:ring-1 focus:ring-[#16A34A]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Telefon Raqami *
                  </label>
                  <input
                    type="text"
                    required
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                    placeholder="+998 90 123 45 67"
                    className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs md:text-sm text-slate-800 focus:border-[#16A34A] focus:outline-none focus:ring-1 focus:ring-[#16A34A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Sinov muddati (kun)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={createForm.trialDays}
                    onChange={(e) => setCreateForm({ ...createForm, trialDays: Number(e.target.value) })}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs md:text-sm text-slate-800 focus:border-[#16A34A] focus:outline-none focus:ring-1 focus:ring-[#16A34A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Manzil *
                </label>
                <input
                  type="text"
                  required
                  value={createForm.address}
                  onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })}
                  placeholder="Toshkent sh., Yunusobod tumani..."
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs md:text-sm text-slate-800 focus:border-[#16A34A] focus:outline-none focus:ring-1 focus:ring-[#16A34A]"
                />
              </div>

              <div className="border-t border-slate-100 pt-3">
                <p className="text-xs font-extrabold text-emerald-800 uppercase tracking-wider mb-2">
                  Dorixona Administratori Hisobi
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700">
                      Administrator Ismi va Familiyasi *
                    </label>
                    <input
                      type="text"
                      required
                      value={createForm.adminName}
                      onChange={(e) => setCreateForm({ ...createForm, adminName: e.target.value })}
                      placeholder="Jasur Qosimov"
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs md:text-sm text-slate-800 focus:border-[#16A34A] focus:outline-none focus:ring-1 focus:ring-[#16A34A]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700">
                        Admin Logini *
                      </label>
                      <input
                        type="text"
                        required
                        value={createForm.adminUsername}
                        onChange={(e) => setCreateForm({ ...createForm, adminUsername: e.target.value })}
                        placeholder="shifo_admin"
                        className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs md:text-sm text-slate-800 focus:border-[#16A34A] focus:outline-none focus:ring-1 focus:ring-[#16A34A]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700">
                        Admin Paroli *
                      </label>
                      <input
                        type="password"
                        required
                        value={createForm.adminPassword}
                        onChange={(e) => setCreateForm({ ...createForm, adminPassword: e.target.value })}
                        placeholder="••••••••"
                        className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs md:text-sm text-slate-800 focus:border-[#16A34A] focus:outline-none focus:ring-1 focus:ring-[#16A34A]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 rounded-xl bg-[#16A34A] px-5 py-2 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-[#15803D] disabled:opacity-50"
                >
                  {isSubmitting ? "Saqlanmoqda..." : "Saqlash va Trial Boshlash"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
