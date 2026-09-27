"use client";

import React, { useEffect, useState } from "react";
import { Settings, Save, RefreshCw, Percent } from "lucide-react";

export default function PharmacySettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pharmacy, setPharmacy] = useState<any>(null);
  const [taxRate, setTaxRate] = useState(0);
  const [taxIncluded, setTaxIncluded] = useState(false);
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/pharmacy/settings");
      const data = await res.json();
      if (data.success) {
        setPharmacy(data.data);
        setTaxRate(data.data.taxRate || 0);
        setTaxIncluded(data.data.taxIncluded || false);
        setAddress(data.data.address || "");
        setPhone(data.data.phone || "");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/pharmacy/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taxRate: Number(taxRate) || 0,
          taxIncluded,
          address,
          phone,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        const errMsg =
          typeof data.error === "object" ? data.error?.message : data.error || "Saqlashda xatolik";
        setMessage({ text: errMsg, type: "error" });
      } else {
        setPharmacy(data.data);
        setMessage({ text: "Sozlamalar muvaffaqiyatli saqlandi", type: "success" });
      }
    } catch (e) {
      setMessage({ text: "Server bilan bog‘lanishda xatolik yuz berdi", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
          <Settings className="h-5 w-5 text-emerald-700" />
        </div>
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Dorixona sozlamalari</h2>
          <p className="text-xs text-slate-500">{pharmacy?.name}</p>
        </div>
      </div>

      {message && (
        <div
          className={`rounded-xl px-4 py-3 text-xs font-bold ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Contact info */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900">Aloqa ma‘lumotlari</h3>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">Telefon raqam</label>
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">Manzil</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Tax settings */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Percent className="h-4 w-4 text-emerald-600" />
          <h3 className="text-sm font-bold text-slate-900">QQS / Soliq sozlamalari</h3>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">
            Soliq stavkasi (%) — 0 bo‘lsa soliq qo‘llanmaydi
          </label>
          <input
            type="number"
            min="0"
            max="100"
            step="0.5"
            value={taxRate}
            onChange={(e) => setTaxRate(Number(e.target.value) || 0)}
            className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-bold focus:border-emerald-500 focus:outline-none"
          />
        </div>

        <div className="space-y-2">
          <label className="flex items-start gap-2.5 rounded-xl border border-slate-200 p-3 cursor-pointer hover:bg-slate-50">
            <input
              type="radio"
              checked={!taxIncluded}
              onChange={() => setTaxIncluded(false)}
              className="mt-0.5 accent-emerald-600"
            />
            <span className="text-xs text-slate-700">
              <span className="font-bold block">Soliq narxga qo‘shiladi (xaridordan undiriladi)</span>
              Summa = Mahsulot + Chegirma ayirilgach + QQS
            </span>
          </label>
          <label className="flex items-start gap-2.5 rounded-xl border border-slate-200 p-3 cursor-pointer hover:bg-slate-50">
            <input
              type="radio"
              checked={taxIncluded}
              onChange={() => setTaxIncluded(true)}
              className="mt-0.5 accent-emerald-600"
            />
            <span className="text-xs text-slate-700">
              <span className="font-bold block">Soliq narx ichida</span>
              Ko‘rsatilgan narx allaqachon QQS ni o‘z ichiga oladi
            </span>
          </label>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#16A34A] py-3.5 text-sm font-extrabold text-white shadow-md shadow-emerald-600/20 hover:bg-[#15803D] disabled:opacity-50"
      >
        <Save className="h-4 w-4" />
        <span>{saving ? "Saqlanmoqda..." : "Sozlamalarni saqlash"}</span>
      </button>
    </div>
  );
}
