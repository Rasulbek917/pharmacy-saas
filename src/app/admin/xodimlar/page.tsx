"use client";

import React, { useState, useEffect } from "react";
import { UserCog, Plus, Search, CheckCircle, X, Shield, Lock, Trash2, RefreshCw, Edit, AlertCircle } from "lucide-react";
import { getRoleLabel, formatDate } from "@/lib/formatters";
import { getErrorMessage } from "@/lib/errorMessage";

export default function StaffPage() {
  const [staff, setStaff] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    username: "",
    password: "",
    phone: "+998 ",
    role: "CASHIER",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Edit modal state
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    fullName: "",
    username: "",
    password: "",
  });
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    loadStaff();
  }, []);

  const loadStaff = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/staff");
      const data = await res.json();
      if (data.success) {
        setStaff(data.data || []);
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
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(getErrorMessage(data.error, "Xodimni qo‘shishda xatolik"));
        setIsSubmitting(false);
        return;
      }

      setSuccessMsg(data.message);
      setShowAddModal(false);
      setFormData({
        fullName: "",
        username: "",
        password: "",
        phone: "+998 ",
        role: "CASHIER",
      });
      loadStaff();
    } catch (e) {
      setErrorMsg("Server xatosi");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (user: any) => {
    const newStatus = user.status === "ACTIVE" ? "BLOCKED" : "ACTIVE";
    if (!confirm(`"${user.fullName}" xodimini ${newStatus === "BLOCKED" ? "bloklamoqchimisiz" : "faollashtirmoqchimisiz"}?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/staff/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        loadStaff();
      } else {
        alert(getErrorMessage(data.error, "Xatolik yuz berdi"));
      }
    } catch (e) {
      alert("Server xatosi");
    }
  };

  const handleDelete = async (user: any) => {
    if (!confirm(`Haqiqatan ham "${user.fullName}" xodimini o‘chirmoqchimisiz?`)) return;

    try {
      const res = await fetch(`/api/staff/${user.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        loadStaff();
      } else {
        alert(getErrorMessage(data.error, "Xatolik yuz berdi"));
      }
    } catch (e) {
      alert("Server xatosi");
    }
  };

  const openEditModal = (user: any) => {
    setEditError(null);
    setEditForm({
      fullName: user.fullName || "",
      username: user.username || "",
      password: "",
    });
    setEditingUser(user);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setIsEditSubmitting(true);
    setEditError(null);

    try {
      const payload: any = {
        fullName: editForm.fullName,
        username: editForm.username.trim(),
      };
      if (editForm.password) payload.password = editForm.password;

      const res = await fetch(`/api/staff/${editingUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setEditError(getErrorMessage(data.error, "Xodimni tahrirlashda xatolik"));
        setIsEditSubmitting(false);
        return;
      }

      setSuccessMsg("Xodim ma'lumotlari muvaffaqiyatli yangilandi");
      setEditingUser(null);
      setEditForm({ fullName: "", username: "", password: "" });
      loadStaff();
    } catch (e) {
      setEditError("Server bilan bog‘lanishda xatolik");
    } finally {
      setIsEditSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">
            Xodimlar Boshqaruvi
          </h2>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Kassirlar va omborchilarni ro‘yxatga olish va huquqlarini boshqarish
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 rounded-xl bg-[#16A34A] px-4 py-2.5 text-xs md:text-sm font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-[#15803D]"
        >
          <Plus className="h-4 w-4" />
          <span>Yangi Xodim Qo‘shish</span>
        </button>
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

      {/* Staff Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3.5">F.I.SH</th>
                <th className="px-4 py-3.5">Logini</th>
                <th className="px-4 py-3.5">Roli</th>
                <th className="px-4 py-3.5">Telefon</th>
                <th className="px-4 py-3.5">Holati</th>
                <th className="px-4 py-3.5">Sotuvlar Soni</th>
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
              ) : staff.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-slate-400">
                    Xodimlar mavjud emas.
                  </td>
                </tr>
              ) : (
                staff.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-slate-900 text-sm">
                      {user.fullName}
                    </td>

                    <td className="px-4 py-3.5 font-mono text-slate-600 font-medium">
                      {user.username}
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="rounded-lg bg-slate-100 px-2.5 py-0.5 font-bold text-slate-700">
                        {getRoleLabel(user.role)}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-slate-600">{user.phone || "-"}</td>

                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 font-bold text-[11px] border ${
                          user.status === "ACTIVE"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : "bg-red-50 text-red-800 border-red-200"
                        }`}
                      >
                        {user.status === "ACTIVE" ? "Aktiv" : "Bloklangan"}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-slate-800 font-semibold">
                      {user._count?.sales || 0} ta
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(user)}
                          className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100"
                          title="Tahrirlash"
                        >
                          <Edit className="h-4 w-4" />
                        </button>

                        <button
                          onClick={() => handleToggleStatus(user)}
                          className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                            user.status === "ACTIVE"
                              ? "bg-amber-50 text-amber-700 hover:bg-amber-100"
                              : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          }`}
                        >
                          {user.status === "ACTIVE" ? "Bloklash" : "Aktiv qilish"}
                        </button>

                        <button
                          onClick={() => handleDelete(user)}
                          className="rounded-lg p-1.5 text-red-600 hover:bg-red-50"
                          title="O‘chirish"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Yangi Xodim Qo‘shish</h3>
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
                <label className="block text-xs font-bold text-slate-700">F.I.SH (To‘liq ismi) *</label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="Madina Karimova"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs md:text-sm focus:border-[#16A34A] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Xodim Roli (Huquqi) *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs md:text-sm focus:border-[#16A34A] focus:outline-none"
                >
                  <option value="CASHIER">Kassir (Sotuv va chek chiqarish)</option>
                  <option value="WAREHOUSEMAN">Omborchi (Kirim va partiyalar hisobi)</option>
                  <option value="PHARMACY_ADMIN">Dorixona Yordamchi Admini</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Login *</label>
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="kassir_1"
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs md:text-sm focus:border-[#16A34A] focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700">Parol *</label>
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs md:text-sm focus:border-[#16A34A] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Telefon Raqami</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+998 90 123 45 67"
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

      {/* Edit Staff Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Edit className="h-5 w-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">Xodimni Tahrirlash</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3">
              {editError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs text-red-700 font-medium flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{editError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700">F.I.SH (To‘liq ismi) *</label>
                <input
                  type="text"
                  required
                  value={editForm.fullName}
                  onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                  placeholder="Madina Karimova"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs md:text-sm focus:border-[#16A34A] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Login *</label>
                <input
                  type="text"
                  required
                  value={editForm.username}
                  onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                  placeholder="kassir_1"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs md:text-sm focus:border-[#16A34A] focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Yangi Parol</label>
                <input
                  type="password"
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  placeholder="O‘zgartirmasangiz bo‘sh qoldiring"
                  autoComplete="new-password"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs md:text-sm focus:border-[#16A34A] focus:outline-none"
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  Bo‘sh qoldirilsa parol o‘zgarmaydi. Yangi parol kamida 5 ta belgi bo‘lsin.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={isEditSubmitting}
                  className="rounded-xl bg-[#16A34A] px-5 py-2 text-xs font-bold text-white hover:bg-[#15803D] disabled:opacity-50"
                >
                  {isEditSubmitting ? "Saqlanmoqda..." : "O‘zgarishlarni Saqlash"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
