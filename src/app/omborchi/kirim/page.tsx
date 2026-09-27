"use client";

import React, { useState, useEffect } from "react";
import {
  ArrowDownToLine,
  Camera,
  Search,
  CheckCircle,
  AlertCircle,
  Pill,
  Truck,
  Barcode,
} from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import BarcodeScannerModal from "@/components/scanner/BarcodeScannerModal";
import UsbBarcodeDetector from "@/components/scanner/UsbBarcodeDetector";

export default function InflowPage() {
  const [medicines, setMedicines] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [selectedMedicine, setSelectedMedicine] = useState<any | null>(null);
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form
  const [formData, setFormData] = useState({
    batchNumber: "",
    quantity: 10,
    purchasePrice: 0,
    salePrice: 0,
    expiryDate: "",
    supplierId: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [medRes, supRes] = await Promise.all([
        fetch("/api/medicines"),
        fetch("/api/suppliers"),
      ]);
      const medData = await medRes.json();
      const supData = await supRes.json();
      if (medData.success) setMedicines(medData.data || []);
      if (supData.success) setSuppliers(supData.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleBarcodeScanned = (code: string) => {
    const trimmed = code.trim();
    const found = medicines.find(
      (m) => m.barcode === trimmed || m.qrCode === trimmed || m.name.toLowerCase().includes(trimmed.toLowerCase())
    );

    if (found) {
      selectMedicine(found);
      setSuccessMessage(`Dori topildi: "${found.name}"`);
    } else {
      setErrorMessage(`"${code}" kodi bo‘yicha dori topilmadi. Avval dori katalogiga qo‘shing.`);
    }
  };

  const selectMedicine = (med: any) => {
    setSelectedMedicine(med);
    setFormData((prev) => ({
      ...prev,
      salePrice: med.salePrice || 0,
      batchNumber: `PT-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
    }));
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMedicine) {
      setErrorMessage("Iltimos, avval dori vositasini tanlang!");
      return;
    }

    if (!formData.expiryDate) {
      setErrorMessage("Yaroqlilik muddatini kiriting!");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/inventory/inflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medicineId: selectedMedicine.id,
          batchNumber: formData.batchNumber,
          quantity: Number(formData.quantity),
          purchasePrice: Number(formData.purchasePrice),
          salePrice: Number(formData.salePrice),
          expiryDate: formData.expiryDate,
          supplierId: formData.supplierId || null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.error || "Omborga kirim qilishda xatolik");
        setIsSubmitting(false);
        return;
      }

      setSuccessMessage(data.message);
      // Reset form
      setFormData({
        batchNumber: "",
        quantity: 10,
        purchasePrice: 0,
        salePrice: 0,
        expiryDate: "",
        supplierId: "",
      });
      setSelectedMedicine(null);
      loadData();
    } catch (e) {
      setErrorMessage("Server xatosi");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* USB barcode detector */}
      <UsbBarcodeDetector onScan={handleBarcodeScanned} />

      {/* Camera scanner modal */}
      <BarcodeScannerModal
        isOpen={showCameraScanner}
        onClose={() => setShowCameraScanner(false)}
        onScanSuccess={handleBarcodeScanned}
        title="Omborga qabul qilish: Shtrix-kod / QR kodni skanerlang"
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">
            Omborga Mahsulot Qabul Qilish (Kirim)
          </h2>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Shtrix-kod/QR orqali partiya yaratish, kelish va sotuv narxlarini belgilash
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCameraScanner(true)}
          className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs md:text-sm font-bold text-white shadow-sm hover:bg-slate-800 transition-colors"
        >
          <Camera className="h-4 w-4 text-emerald-400" />
          <span>Kamera orqali skanerlash</span>
        </button>
      </div>

      {/* Messages */}
      {successMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)}>×</button>
        </div>
      )}

      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)}>×</button>
        </div>
      )}

      {/* Step 1: Select or Scan Medicine */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <Pill className="h-4 w-4 text-emerald-600" />
          1-Qadam: Dori vositasini tanlash
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">
              Katalogdan dori vositasini tanlang:
            </label>
            <select
              value={selectedMedicine?.id || ""}
              onChange={(e) => {
                const found = medicines.find((m) => m.id === e.target.value);
                if (found) selectMedicine(found);
              }}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs md:text-sm text-slate-800 focus:border-[#16A34A] focus:outline-none"
            >
              <option value="">-- Dorini tanlang --</option>
              {medicines.map((med) => (
                <option key={med.id} value={med.id}>
                  {med.name} ({med.unit}) — {med.barcode || "kod yo'q"}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">
              USB Skaner yoki Kamera orqali:
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowCameraScanner(true)}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
              >
                <Camera className="h-4 w-4" />
                <span>Kamera skanerini ochish</span>
              </button>
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              * Noutbukdagi USB shtrix-kod skanerdan to‘g‘ridan-to‘g‘ri o‘qitsangiz ham avtomatik topiladi.
            </p>
          </div>
        </div>

        {/* Selected Medicine Info Banner */}
        {selectedMedicine && (
          <div className="mt-3 rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-emerald-900 block">
                Tanlangan dori: {selectedMedicine.name}
              </span>
              <span className="text-[11px] text-emerald-700">
                Shtrix-kod: {selectedMedicine.barcode || "Mavjud emas"} • Birligi: {selectedMedicine.unit} •
                Hozirgi umumiy qoldiq: {selectedMedicine.totalStock || 0} {selectedMedicine.unit}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedMedicine(null)}
              className="text-xs font-bold text-slate-500 hover:text-slate-800"
            >
              O‘zgartirish
            </button>
          </div>
        )}
      </div>

      {/* Step 2: Batch and Pricing Inflow Form */}
      {selectedMedicine && (
        <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4 animate-in fade-in">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <ArrowDownToLine className="h-4 w-4 text-emerald-600" />
            2-Qadam: Partiya va Narx Ma'lumotlari
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Partiya Raqami *
              </label>
              <input
                type="text"
                required
                value={formData.batchNumber}
                onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                placeholder="PT-2026-001"
                className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs md:text-sm text-slate-800 focus:border-[#16A34A] focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Qabul Miqdori ({selectedMedicine.unit}) *
              </label>
              <input
                type="number"
                min="1"
                required
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs md:text-sm font-bold text-slate-900 focus:border-[#16A34A] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Yaroqlilik Muddati *
              </label>
              <input
                type="date"
                required
                value={formData.expiryDate}
                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs md:text-sm text-slate-800 focus:border-[#16A34A] focus:outline-none font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Kelish Narxi (1 {selectedMedicine.unit} uchun) *
              </label>
              <input
                type="number"
                min="0"
                step="100"
                required
                value={formData.purchasePrice}
                onChange={(e) => setFormData({ ...formData, purchasePrice: Number(e.target.value) })}
                placeholder="Tan narx"
                className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs md:text-sm text-slate-800 focus:border-[#16A34A] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Sotuv Narxi (1 {selectedMedicine.unit} uchun) *
              </label>
              <input
                type="number"
                min="0"
                step="100"
                required
                value={formData.salePrice}
                onChange={(e) => setFormData({ ...formData, salePrice: Number(e.target.value) })}
                placeholder="Kassada sotiladigan narx"
                className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs md:text-sm font-bold text-emerald-700 focus:border-[#16A34A] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Yetkazib Beruvchi (Ta'minotchi)
              </label>
              <select
                value={formData.supplierId}
                onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs md:text-sm text-slate-800 focus:border-[#16A34A] focus:outline-none"
              >
                <option value="">-- Ta'minotchisiz --</option>
                {suppliers.map((sup) => (
                  <option key={sup.id} value={sup.id}>
                    {sup.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Calculations preview */}
          <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div>
              <span className="text-slate-500">Jami xarid summasi:</span>
              <span className="font-bold text-slate-900 ml-1.5">
                {formatCurrency(formData.purchasePrice * formData.quantity)}
              </span>
            </div>

            <div>
              <span className="text-slate-500">Kutilayotgan sotuv summasi:</span>
              <span className="font-bold text-emerald-700 ml-1.5">
                {formatCurrency(formData.salePrice * formData.quantity)}
              </span>
            </div>

            <div>
              <span className="text-slate-500">Kutilayotgan sof foyda:</span>
              <span className="font-bold text-emerald-700 ml-1.5">
                {formatCurrency(
                  Math.max(0, (formData.salePrice - formData.purchasePrice) * formData.quantity)
                )}
              </span>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-xl bg-[#16A34A] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 hover:bg-[#15803D] disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? (
                <span>Qabul qilinmoqda...</span>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  <span>Omborga Qabul Qilish (Saqlash)</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
