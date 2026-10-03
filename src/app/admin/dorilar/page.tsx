"use client";

import React, { useState, useEffect } from "react";
import {
  Pill,
  Plus,
  Search,
  Camera,
  Edit,
  Trash2,
  X,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  QrCode,
  Barcode,
} from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import BarcodeScannerModal from "@/components/scanner/BarcodeScannerModal";
import UsbBarcodeDetector from "@/components/scanner/UsbBarcodeDetector";
import QrLabelModal from "@/components/scanner/QrLabelModal";
import { getErrorMessage } from "@/lib/errorMessage";

export default function MedicinesPage() {
  const [medicines, setMedicines] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const [scanningTarget, setScanningTarget] = useState<"search" | "form">("search");

  // Post-creation workflow state
  const [createdMedicine, setCreatedMedicine] = useState<any | null>(null);
  const [showPostCreateModal, setShowPostCreateModal] = useState(false);
  const [selectedQrMedicine, setSelectedQrMedicine] = useState<any | null>(null);
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    barcode: "",
    qrCode: "",
    categoryId: "",
    manufacturerId: "",
    salePrice: 0,
    minStock: 5,
    unit: "dona",
    description: "",
  });
  const [categories, setCategories] = useState<any[]>([]);
  const [manufacturers, setManufacturers] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [scannedNotice, setScannedNotice] = useState<string | null>(null);

  useEffect(() => {
    loadMedicines();
    loadCategoriesAndManufacturers();
  }, []);

  const loadCategoriesAndManufacturers = async () => {
    try {
      const [catRes, manRes] = await Promise.all([
        fetch("/api/categories"),
        fetch("/api/manufacturers"),
      ]);
      const catData = await catRes.json();
      const manData = await manRes.json();
      if (catData.success) setCategories(catData.data || []);
      if (manData.success) setManufacturers(manData.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const loadMedicines = async (searchTerm = search) => {
    setIsLoading(true);
    try {
      const url = searchTerm ? `/api/medicines?search=${encodeURIComponent(searchTerm)}` : "/api/medicines";
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setMedicines(data.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadMedicines(search);
  };

  const handleBarcodeScanned = (code: string) => {
    if (scanningTarget === "search") {
      setSearch(code);
      loadMedicines(code);
    } else {
      setFormData((prev) => ({ ...prev, barcode: code }));
      setScannedNotice(`Shtrix-kod qabul qilindi: ${code}`);
      setTimeout(() => setScannedNotice(null), 4000);
    }
  };

  const handleGenerateQrForMedicine = async (med: any) => {
    setIsGeneratingQr(true);
    try {
      const res = await fetch(`/api/medicines/${med.id}/qr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regenerate: false }),
      });
      const data = await res.json();
      if (data.success && data.medicine) {
        setSelectedQrMedicine(data.medicine);
        loadMedicines();
      } else {
        alert(getErrorMessage(data.error, "QR kod yaratishda xatolik yuz berdi"));
      }
    } catch (e) {
      alert("Server bilan aloqa xatosi");
    } finally {
      setIsGeneratingQr(false);
    }
  };

  const handleRegenerateQr = async (medicineId: string) => {
    const res = await fetch(`/api/medicines/${medicineId}/qr`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ regenerate: true }),
    });
    const data = await res.json();
    if (data.success && data.medicine) {
      setSelectedQrMedicine(data.medicine);
      loadMedicines();
    } else {
      throw new Error(getErrorMessage(data.error, "QR kod yangilashda xatolik"));
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/medicines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(getErrorMessage(data.error, "Dori vositasini saqlashda xatolik"));
        setIsSubmitting(false);
        return;
      }

      const newMed = data.data;
      setSuccessMessage(data.message);
      setShowAddModal(false);
      setFormData({
        name: "",
        barcode: "",
        qrCode: "",
        categoryId: "",
        manufacturerId: "",
        salePrice: 0,
        minStock: 5,
        unit: "dona",
        description: "",
      });
      loadMedicines();

      // Trigger post-creation workflow: Dori yaratildi -> QR yaratish -> QRni ko'rish
      setCreatedMedicine(newMed);
      setShowPostCreateModal(true);
    } catch (err) {
      setErrorMessage("Server xatosi");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Haqiqatan ham "${name}" dori vositasini o‘chirmoqchimisiz?`)) return;

    try {
      const res = await fetch(`/api/medicines/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        loadMedicines();
      } else {
        alert(getErrorMessage(data.error, "Xatolik yuz berdi"));
      }
    } catch (e) {
      alert("Server xatosi");
    }
  };

  return (
    <div className="space-y-6">
      {/* USB Barcode listener for laptop/desktop */}
      <UsbBarcodeDetector onScan={handleBarcodeScanned} enabled={!showAddModal} />

      {/* Camera scanner modal */}
      <BarcodeScannerModal
        isOpen={showCameraScanner}
        onClose={() => setShowCameraScanner(false)}
        onScanSuccess={handleBarcodeScanned}
        title={
          scanningTarget === "search"
            ? "Dorini qidirish uchun kodni skanerlang"
            : "Yangi dorining shtrix-kodini skanerlang"
        }
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">
            Dori Vositalari Katalogi
          </h2>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Dorilar ro‘yxati, shtrix-kodlar, sotuv narxlari va ombor qoldiqlari
          </p>
        </div>

        <button
          onClick={() => {
            setFormData({
              name: "",
              barcode: "",
              qrCode: "",
              categoryId: "",
              manufacturerId: "",
              salePrice: 0,
              minStock: 5,
              unit: "dona",
              description: "",
            });
            setShowAddModal(true);
          }}
          className="flex items-center justify-center gap-2 rounded-xl bg-[#16A34A] px-4 py-2.5 text-xs md:text-sm font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-[#15803D] transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Yangi Dori Qo‘shish</span>
        </button>
      </div>

      {/* Success Notification */}
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

      {/* Search Bar with Camera Barcode Scanner Button */}
      <form onSubmit={handleSearchSubmit} className="flex gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Dori nomi, shtrix-kod yoki QR kod orqali qidirish (yoki USB skanerlang)..."
            className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2 text-xs md:text-sm text-slate-800 placeholder-slate-400 focus:border-[#16A34A] focus:outline-none"
          />
        </div>

        <button
          type="button"
          onClick={() => {
            setScanningTarget("search");
            setShowCameraScanner(true);
          }}
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          title="Telefon kamerasi orqali skanerlash"
        >
          <Camera className="h-4 w-4 text-emerald-600" />
          <span className="hidden sm:inline">Kamera Skaner</span>
        </button>

        <button
          type="submit"
          className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
        >
          Qidirish
        </button>
      </form>

      {/* Medicines Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3.5">Dori Nomi</th>
                <th className="px-4 py-3.5">Shtrix-kod / QR</th>
                <th className="px-4 py-3.5">Kategoriya</th>
                <th className="px-4 py-3.5">Sotuv Narxi</th>
                <th className="px-4 py-3.5">Ombor Qoldig‘i</th>
                <th className="px-4 py-3.5">Minimal Chegara</th>
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
              ) : medicines.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-slate-400">
                    Hech qanday dori vositasi topilmadi.
                  </td>
                </tr>
              ) : (
                medicines.map((med) => {
                  const isLow = med.totalStock <= med.minStock;

                  return (
                    <tr key={med.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 font-bold">
                            <Pill className="h-4 w-4" />
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 text-sm">{med.name}</span>
                            {med.description && (
                              <span className="block text-[11px] text-slate-400 line-clamp-1">
                                {med.description}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 font-mono text-[11px] text-slate-600">
                        {med.barcode ? (
                          <div className="flex items-center gap-1">
                            <Barcode className="h-3.5 w-3.5 text-slate-400" />
                            <span>{med.barcode}</span>
                          </div>
                        ) : med.qrCode ? (
                          <div className="flex items-center gap-1">
                            <QrCode className="h-3.5 w-3.5 text-slate-400" />
                            <span>{med.qrCode}</span>
                          </div>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-slate-600">
                        {med.category?.name || "Kategoriyasiz"}
                      </td>

                      <td className="px-4 py-3.5 font-extrabold text-slate-900 text-sm">
                        {formatCurrency(med.salePrice)}
                      </td>

                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold border ${
                            isLow
                              ? "bg-red-50 text-red-700 border-red-200"
                              : "bg-emerald-50 text-emerald-800 border-emerald-200"
                          }`}
                        >
                          {med.totalStock} {med.unit}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-slate-500">
                        {med.minStock} {med.unit}
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {med.qrCode ? (
                            <button
                              onClick={() => setSelectedQrMedicine(med)}
                              className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                              title="QR-kodni ko‘rish va stiker chop etish"
                            >
                              <QrCode className="h-3.5 w-3.5" />
                              <span>QR ko‘rish</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleGenerateQrForMedicine(med)}
                              disabled={isGeneratingQr}
                              className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50"
                              title="QR-kod generatsiya qilish"
                            >
                              <QrCode className="h-3.5 w-3.5 text-slate-500" />
                              <span>QR yaratish</span>
                            </button>
                          )}

                          <button
                            onClick={() => handleDelete(med.id, med.name)}
                            className="rounded-lg p-1.5 text-red-600 hover:bg-red-50 transition-colors"
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

      {/* ADD MEDICINE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4">
              <div className="flex items-center gap-2">
                <Pill className="h-5 w-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">Yangi Dori Vositasi Qo‘shish</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
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
                  Dori Nomi va Dozasi *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Masalan: Paratsetamol 500 mg №10"
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs md:text-sm text-slate-800 focus:border-[#16A34A] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Shtrix-kod (Barcode)
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setScanningTarget("form");
                        setShowCameraScanner(true);
                      }}
                      className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                    >
                      <Camera className="h-3 w-3" />
                      <span>Kamera</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    placeholder="478000..."
                    className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs md:text-sm text-slate-800 focus:border-[#16A34A] focus:outline-none font-mono"
                  />
                  {scannedNotice && (
                    <span className="mt-1 flex items-center gap-1 text-[11px] font-bold text-emerald-700 animate-in fade-in">
                      <CheckCircle className="h-3 w-3" />
                      <span>{scannedNotice}</span>
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    QR Kodi (Ixtiyoriy)
                  </label>
                  <input
                    type="text"
                    value={formData.qrCode}
                    onChange={(e) => setFormData({ ...formData, qrCode: e.target.value })}
                    placeholder="MED-001"
                    className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs md:text-sm text-slate-800 focus:border-[#16A34A] focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Category & Manufacturer */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Kategoriya
                  </label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs md:text-sm text-slate-800 focus:border-[#16A34A] focus:outline-none"
                  >
                    <option value="">— Tanlang —</option>
                    {categories.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Ishlab chiqaruvchi
                  </label>
                  <select
                    value={formData.manufacturerId}
                    onChange={(e) => setFormData({ ...formData, manufacturerId: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs md:text-sm text-slate-800 focus:border-[#16A34A] focus:outline-none"
                  >
                    <option value="">— Tanlang —</option>
                    {manufacturers.map((m: any) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Sotuv Narxi (so‘m) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    required
                    value={formData.salePrice}
                    onChange={(e) => setFormData({ ...formData, salePrice: Number(e.target.value) })}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs md:text-sm text-slate-800 focus:border-[#16A34A] focus:outline-none font-bold text-emerald-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    O‘lchov birligi
                  </label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs md:text-sm text-slate-800 focus:border-[#16A34A] focus:outline-none"
                  >
                    <option value="dona">dona</option>
                    <option value="quti">quti</option>
                    <option value="ampula">ampula</option>
                    <option value="flakon">flakon</option>
                    <option value="tubik">tubik</option>
                    <option value="kapsula">kapsula</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Min. qoldiq
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.minStock}
                    onChange={(e) => setFormData({ ...formData, minStock: Number(e.target.value) })}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs md:text-sm text-slate-800 focus:border-[#16A34A] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Tavsif yoki Izoh
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Dori haqida qo‘shimcha ma'lumot..."
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs md:text-sm text-slate-800 focus:border-[#16A34A] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 rounded-xl bg-[#16A34A] px-5 py-2 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-[#15803D] disabled:opacity-50"
                >
                  {isSubmitting ? "Saqlanmoqda..." : "Saqlash"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POST-CREATE WORKFLOW MODAL: Dori yaratildi -> QR yaratish -> QRni ko'rish */}
      {showPostCreateModal && createdMedicine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                <CheckCircle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Dori Muvaffaqiyatli Qo‘shildi!
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {createdMedicine.name}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5 text-xs text-slate-700 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Sotuv narxi:</span>
                <span className="font-bold text-emerald-700">{formatCurrency(createdMedicine.salePrice)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">O‘lchov birligi:</span>
                <span className="font-semibold">{createdMedicine.unit}</span>
              </div>
              {createdMedicine.barcode && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Shtrix-kod:</span>
                  <span className="font-mono">{createdMedicine.barcode}</span>
                </div>
              )}
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Dori vositasi bazaga muvaffaqiyatli saqlandi. Qadoqqa yopishtirish uchun unikal QR-kod yaratishni xohlaysizmi?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setShowPostCreateModal(false);
                  setCreatedMedicine(null);
                }}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Katalogga qaytish
              </button>

              <button
                type="button"
                onClick={async () => {
                  const targetMed = createdMedicine;
                  setShowPostCreateModal(false);
                  setCreatedMedicine(null);
                  await handleGenerateQrForMedicine(targetMed);
                }}
                disabled={isGeneratingQr}
                className="flex items-center gap-1.5 rounded-xl bg-[#16A34A] px-4 py-2 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-[#15803D] transition-colors disabled:opacity-50"
              >
                <QrCode className="h-4 w-4" />
                <span>{isGeneratingQr ? "Yaratilmoqda..." : "QR-kod Yaratish"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR LABEL MODAL */}
      <QrLabelModal
        isOpen={Boolean(selectedQrMedicine)}
        onClose={() => setSelectedQrMedicine(null)}
        medicine={selectedQrMedicine}
        onRegenerate={handleRegenerateQr}
      />
    </div>
  );
}
