"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  Camera,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  CreditCard,
  Banknote,
  Smartphone,
  CheckCircle,
  AlertCircle,
  Pill,
  Printer,
  RotateCcw,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";
import BarcodeScannerModal from "@/components/scanner/BarcodeScannerModal";
import UsbBarcodeDetector from "@/components/scanner/UsbBarcodeDetector";
import ReceiptModal from "@/components/pos/ReceiptModal";
import { CartItem } from "@/types";

export default function CashierPosPage() {
  const [medicines, setMedicines] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCameraScanner, setShowCameraScanner] = useState(false);

  // Cart
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CARD" | "ELECTRONIC">("CASH");
  const [paidAmount, setPaidAmount] = useState<number>(0);

  // Checkout modal & Receipt state
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutKey, setCheckoutKey] = useState<string>("");
  const [completedReceipt, setCompletedReceipt] = useState<any | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [taxSettings, setTaxSettings] = useState<{ taxRate: number; taxIncluded: boolean }>({
    taxRate: 0,
    taxIncluded: false,
  });

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadMedicines();
    loadCustomers();
    loadTaxSettings();
  }, []);

  const loadTaxSettings = async () => {
    try {
      const res = await fetch("/api/pharmacy/settings");
      const data = await res.json();
      if (data.success && data.data) {
        setTaxSettings({
          taxRate: data.data.taxRate || 0,
          taxIncluded: data.data.taxIncluded || false,
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadMedicines = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/medicines");
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

  const loadCustomers = async () => {
    try {
      const res = await fetch("/api/customers");
      const data = await res.json();
      if (data.success) {
        setCustomers(data.data || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Barcode scanned by Camera or USB
  const handleBarcodeScanned = async (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return;

    // 1. Check local state first
    let found = medicines.find(
      (m) =>
        m.barcode === trimmed ||
        m.qrCode === trimmed ||
        m.name.toLowerCase() === trimmed.toLowerCase()
    );

    // 2. If not found in current local view, query backend directly
    if (!found) {
      try {
        const res = await fetch(`/api/medicines?search=${encodeURIComponent(trimmed)}`);
        const data = await res.json();
        if (data.success && data.data && data.data.length > 0) {
          found = data.data.find(
            (m: any) => m.barcode === trimmed || m.qrCode === trimmed
          ) || data.data[0];

          // Add to local state cache
          setMedicines((prev) => {
            if (!prev.find((m) => m.id === found.id)) {
              return [...prev, found];
            }
            return prev;
          });
        }
      } catch (e) {
        console.error("Barcode lookup error:", e);
      }
    }

    if (found) {
      addToCart(found);
    } else {
      setStatusMessage({
        text: `"${code}" kodi bo‘yicha omborda hech qanday mahsulot topilmadi!`,
        type: "error",
      });
    }
  };

  // Add medicine to cart with FEFO batch selection
  const addToCart = (medicine: any) => {
    setStatusMessage(null);
    const now = new Date();

    // 1. Check if batches exist with quantity > 0
    const inStockBatches = (medicine.batches || []).filter(
      (b: any) => b.currentQuantity > 0
    );

    if (inStockBatches.length === 0) {
      setStatusMessage({
        text: `"${medicine.name}" omborda mavjud emas! Qoldiq: 0`,
        type: "error",
      });
      return;
    }

    // 2. FEFO: select the batch with the earliest expiry date among NON-EXPIRED batches
    const availableBatches = inStockBatches.filter(
      (b: any) => new Date(b.expiryDate) > now
    );

    // Block sale only if every in-stock batch is expired (Section 19)
    if (availableBatches.length === 0) {
      setStatusMessage({
        text: `DIQQAT: "${medicine.name}" ning ombordagi barcha partiyalari muddati tugagan! Ushbu dorini sotish qat'iyan taqiqlanadi.`,
        type: "error",
      });
      return;
    }

    // Sort ascending by expiry date
    const sortedBatches = [...availableBatches].sort(
      (a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
    );

    const bestBatch = sortedBatches[0];

    // Check if item already in cart
    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.medicineId === medicine.id && item.batchId === bestBatch.id
      );

      if (existingIndex > -1) {
        const item = prev[existingIndex];
        if (item.quantity + 1 > item.availableQuantity) {
          setStatusMessage({
            text: `"${medicine.name}" partiyasida maksimal qoldiq: ${item.availableQuantity} ta!`,
            type: "error",
          });
          return prev;
        }

        const updated = [...prev];
        updated[existingIndex] = {
          ...item,
          quantity: item.quantity + 1,
          totalPrice: (item.quantity + 1) * item.unitPrice - item.discount,
        };
        return updated;
      } else {
        const newItem: CartItem = {
          medicineId: medicine.id,
          medicineName: medicine.name,
          batchId: bestBatch.id,
          batchNumber: bestBatch.batchNumber,
          expiryDate: bestBatch.expiryDate,
          unit: medicine.unit,
          unitPrice: medicine.salePrice,
          purchasePrice: bestBatch.purchasePrice,
          availableQuantity: bestBatch.currentQuantity,
          quantity: 1,
          discount: 0,
          totalPrice: medicine.salePrice,
        };
        return [...prev, newItem];
      }
    });

    setStatusMessage({
      text: `"${medicine.name}" savatchaga qo‘shildi.`,
      type: "success",
    });
  };

  const updateQuantity = (index: number, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(index);
      return;
    }

    setCart((prev) => {
      const updated = [...prev];
      const item = updated[index];
      if (newQty > item.availableQuantity) {
        alert(`Ushbu partiyada faqat ${item.availableQuantity} ta mavjud!`);
        return prev;
      }

      updated[index] = {
        ...item,
        quantity: newQty,
        totalPrice: newQty * item.unitPrice - item.discount,
      };
      return updated;
    });
  };

  const removeFromCart = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const clearCart = () => {
    if (cart.length === 0) return;
    if (confirm("Savatchani tozalashni xohlaysizmi?")) {
      setCart([]);
      setDiscountAmount(0);
      setStatusMessage(null);
    }
  };

  // Calculations (must mirror server-side logic in /api/sales)
  const cartSubtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const afterDiscount = Math.max(0, cartSubtotal - discountAmount);
  let taxAmount = 0;
  let cartTotal = afterDiscount;
  if (taxSettings.taxRate > 0) {
    if (taxSettings.taxIncluded) {
      taxAmount = Math.round(afterDiscount - afterDiscount / (1 + taxSettings.taxRate / 100));
    } else {
      taxAmount = Math.round(afterDiscount * (taxSettings.taxRate / 100));
      cartTotal = afterDiscount + taxAmount;
    }
  }

  // Open Checkout Modal
  const handleOpenCheckout = () => {
    if (cart.length === 0) {
      alert("Savatcha bo‘sh!");
      return;
    }
    setCheckoutKey(`CHK_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`);
    setPaidAmount(cartTotal);
    setShowCheckoutModal(true);
  };

  // Submit Sale
  const handleCompleteSale = async () => {
    if (cart.length === 0 || isProcessing) return;

    if (Number(paidAmount) < cartTotal) {
      alert(
        `To‘langan summa (${formatCurrency(paidAmount)}) to‘lov summasidan (${formatCurrency(
          cartTotal
        )}) kam bo‘lishi mumkin emas!`
      );
      return;
    }

    if (Number(discountAmount) > cartSubtotal) {
      alert("Chegirma savat umumiy qiymatidan oshishi mumkin emas!");
      return;
    }

    setIsProcessing(true);
    try {
      const payload = {
        customerId: selectedCustomerId || null,
        paymentMethod,
        discountAmount: Number(discountAmount) || 0,
        paidAmount: Number(paidAmount) || cartTotal,
        idempotencyKey: checkoutKey,
        items: cart.map((item) => ({
          medicineId: item.medicineId,
          batchId: item.batchId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount,
        })),
      };

      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        const errorMsg =
          typeof data.error === "object"
            ? data.error?.message || JSON.stringify(data.error)
            : data.error || "Sotuvni yakunlashda xatolik yuz berdi";
        alert(errorMsg);
        setIsProcessing(false);
        return;
      }

      // Success!
      setShowCheckoutModal(false);
      setCompletedReceipt(data.data);
      setShowReceiptModal(true);
      setCart([]);
      setDiscountAmount(0);
      loadMedicines(); // Refresh stock
    } catch (err: any) {
      alert("Server bilan bog‘lanishda xatolik: " + (err.message || ""));
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredMedicines = medicines.filter((m) => {
    return (
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      (m.barcode && m.barcode.includes(search)) ||
      (m.qrCode && m.qrCode.toLowerCase().includes(search.toLowerCase()))
    );
  });

  return (
    <div className="space-y-4">
      {/* USB Hardware Barcode Detector */}
      <UsbBarcodeDetector onScan={handleBarcodeScanned} enabled={!showCheckoutModal} />

      {/* Camera Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={showCameraScanner}
        onClose={() => setShowCameraScanner(false)}
        onScanSuccess={handleBarcodeScanned}
        title="Kamera orqali dorining shtrix-kodini skanerlang"
      />

      {/* Printable Receipt Modal */}
      <ReceiptModal
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        receipt={completedReceipt}
      />

      {/* Status banner */}
      {statusMessage && (
        <div
          className={`rounded-xl p-3.5 text-xs font-bold flex items-center justify-between animate-in fade-in ${
            statusMessage.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === "success" ? (
              <CheckCircle className="h-4 w-4 text-emerald-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)}>×</button>
        </div>
      )}

      {/* Main POS Interface (Grid: 2 Columns on Desktop) */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* LEFT: Medicine Search and Fast Catalog (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Barcode Search & Camera Button */}
          <div className="flex gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Dori nomi yoki shtrix-kodini kiriting (yoki USB skanerlang)..."
                className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:border-[#16A34A] focus:outline-none"
              />
            </div>

            <button
              onClick={() => setShowCameraScanner(true)}
              className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors"
              title="Telefon kamerasi orqali shtrix-kod skanerlash"
            >
              <Camera className="h-4 w-4 text-emerald-400" />
              <span className="hidden sm:inline">Kamera Skaner</span>
            </button>
          </div>

          {/* Medicine Fast Selection Grid */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Dori vositalari ({filteredMedicines.length})
              </span>
              <span className="text-[11px] text-slate-400">
                Bosish orqali tezkor savatga qo‘shish
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5 max-h-[520px] overflow-y-auto pr-1">
              {isLoading ? (
                <div className="col-span-full py-12 text-center text-xs text-slate-400">
                  Dorilar yuklanmoqda...
                </div>
              ) : filteredMedicines.length === 0 ? (
                <div className="col-span-full py-12 text-center text-xs text-slate-400">
                  Mos dori vositasi topilmadi.
                </div>
              ) : (
                filteredMedicines.map((med) => {
                  const hasStock = med.totalStock > 0;

                  return (
                    <button
                      key={med.id}
                      type="button"
                      disabled={!hasStock}
                      onClick={() => addToCart(med)}
                      className={`flex flex-col justify-between rounded-xl border p-3 text-left transition-all active:scale-[0.98] ${
                        hasStock
                          ? "border-slate-200 bg-white hover:border-emerald-500 hover:shadow-md cursor-pointer"
                          : "border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed"
                      }`}
                    >
                      <div>
                        <p className="font-bold text-slate-900 text-xs line-clamp-2">
                          {med.name}
                        </p>
                        <span className="mt-0.5 block text-[10px] text-slate-400 font-mono">
                          {med.barcode || med.qrCode || "Kod yo'q"}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-xs">
                        <span className="font-extrabold text-[#16A34A]">
                          {formatCurrency(med.salePrice)}
                        </span>
                        <span
                          className={`text-[10px] font-semibold ${
                            hasStock ? "text-slate-500" : "text-red-500"
                          }`}
                        >
                          {hasStock ? `${med.totalStock} ${med.unit}` : "Tugagan"}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: Active Cart and Payment Panel (5 Cols) */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col h-full min-h-[580px]">
          {/* Cart Header */}
          <div className="flex items-center justify-between border-b border-slate-100 p-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                <ShoppingCart className="h-4 w-4" />
              </div>
              <h3 className="font-extrabold text-slate-900 text-sm md:text-base">
                Sotuv Savatchasi ({cart.length})
              </h3>
            </div>

            {cart.length > 0 && (
              <button
                type="button"
                onClick={clearCart}
                className="text-xs font-semibold text-red-600 hover:text-red-700"
              >
                Tozalash
              </button>
            )}
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 divide-y divide-slate-100">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-slate-400 text-xs">
                <ShoppingCart className="h-10 w-10 text-slate-200 mb-2" />
                <p>Savatcha hozircha bo‘sh.</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Dorini tanlang yoki shtrix-kodini skanerlang.
                </p>
              </div>
            ) : (
              cart.map((item, idx) => (
                <div key={idx} className="pt-3 first:pt-0 flex items-center justify-between gap-3 text-xs">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 truncate">{item.medicineName}</p>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                      <span>{formatCurrency(item.unitPrice)}</span>
                      <span>•</span>
                      <span className="font-mono text-emerald-700">#{item.batchNumber}</span>
                      <span>•</span>
                      <span>Yaroqlilik: {formatDate(item.expiryDate)}</span>
                    </div>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => updateQuantity(idx, item.quantity - 1)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-7 text-center font-bold text-slate-900 text-sm">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(idx, item.quantity + 1)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>

                  {/* Price */}
                  <div className="text-right">
                    <span className="font-extrabold text-slate-900 text-sm block">
                      {formatCurrency(item.totalPrice)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeFromCart(idx)}
                    className="text-slate-300 hover:text-red-600 p-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Cart Bottom Summary & Checkout Button */}
          <div className="border-t border-slate-100 bg-slate-50/60 p-4 space-y-3">
            {/* Customer select */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Mijoz (Ixtiyoriy)
              </label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-[#16A34A] focus:outline-none"
              >
                <option value="">Oddiy xaridor (Ro'yxatsiz)</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.phone && `(${c.phone})`}
                  </option>
                ))}
              </select>
            </div>

            {/* Subtotal & Discount */}
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Oraliq summa:</span>
                <span>{formatCurrency(cartSubtotal)}</span>
              </div>

              <div className="flex items-center justify-between text-slate-600">
                <span>Chegirma summasi:</span>
                <input
                  type="number"
                  min="0"
                  step="500"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(Number(e.target.value) || 0)}
                  className="w-28 rounded-lg border border-slate-300 bg-white px-2 py-1 text-right text-xs font-bold text-red-600 focus:border-red-500 focus:outline-none"
                />
              </div>

              {taxSettings.taxRate > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>
                    QQS ({taxSettings.taxRate}%{taxSettings.taxIncluded ? ", ichida" : ""}):
                  </span>
                  <span>{formatCurrency(taxAmount)}</span>
                </div>
              )}

              <div className="flex justify-between items-baseline pt-2 border-t border-slate-200">
                <span className="font-extrabold text-sm text-slate-900">Jami To‘lov:</span>
                <span className="text-xl font-extrabold text-[#16A34A]">
                  {formatCurrency(cartTotal)}
                </span>
              </div>
            </div>

            {/* Pay Button */}
            <button
              type="button"
              disabled={cart.length === 0}
              onClick={handleOpenCheckout}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#16A34A] py-3.5 text-sm font-extrabold text-white shadow-lg shadow-emerald-600/20 hover:bg-[#15803D] active:scale-[0.98] transition-all disabled:opacity-50"
            >
              <CheckCircle className="h-5 w-5" />
              <span>To‘lovga O‘tish ({formatCurrency(cartTotal)})</span>
            </button>
          </div>
        </div>
      </div>

      {/* CHECKOUT PAYMENT MODAL (Section 21) */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50 px-6 py-4">
              <h3 className="text-base font-extrabold text-slate-900">To‘lovni Qabul Qilish</h3>
              <p className="text-xs text-slate-500 mt-0.5">To‘lov turini tanlang va summani kiriting</p>
            </div>

            <div className="p-6 space-y-4">
              {/* Payment Methods (Naqd, Karta, Elektron) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                  To‘lov Turi
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("CASH")}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-bold transition-all ${
                      paymentMethod === "CASH"
                        ? "border-[#16A34A] bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20"
                        : "border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <Banknote className="h-5 w-5 text-emerald-600" />
                    <span>Naqd pul</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("CARD")}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-bold transition-all ${
                      paymentMethod === "CARD"
                        ? "border-[#16A34A] bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20"
                        : "border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <CreditCard className="h-5 w-5 text-emerald-600" />
                    <span>Bank kartasi</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("ELECTRONIC")}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-bold transition-all ${
                      paymentMethod === "ELECTRONIC"
                        ? "border-[#16A34A] bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20"
                        : "border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <Smartphone className="h-5 w-5 text-emerald-600" />
                    <span>Elektron to‘lov</span>
                  </button>
                </div>
              </div>

              {/* Total and Paid Amount inputs */}
              <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 space-y-2">
                {taxSettings.taxRate > 0 && (
                  <div className="flex justify-between items-center text-xs text-slate-600">
                    <span>
                      QQS ({taxSettings.taxRate}%{taxSettings.taxIncluded ? ", ichida" : ""}):
                    </span>
                    <span className="font-bold">{formatCurrency(taxAmount)}</span>
                  </div>
                )}

                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600 font-medium">To‘lanadigan summa:</span>
                  <span className="text-base font-extrabold text-emerald-700">
                    {formatCurrency(cartTotal)}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mt-2">
                    Qabul qilingan summa (so‘m):
                  </label>
                  <input
                    type="number"
                    min={cartTotal}
                    step="1000"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(Number(e.target.value) || 0)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-base font-extrabold text-slate-900 focus:border-[#16A34A] focus:outline-none"
                  />
                </div>

                {paidAmount > cartTotal && (
                  <div className="flex justify-between items-center pt-2 border-t border-slate-200 text-xs">
                    <span className="font-bold text-slate-700">Xaridorga qaytim:</span>
                    <span className="font-extrabold text-blue-700 text-sm">
                      {formatCurrency(paidAmount - cartTotal)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50 px-6 py-4">
              <button
                type="button"
                onClick={() => setShowCheckoutModal(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Bekor qilish
              </button>

              <button
                type="button"
                disabled={isProcessing || paidAmount < cartTotal}
                onClick={handleCompleteSale}
                className="flex items-center gap-2 rounded-xl bg-[#16A34A] px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#15803D] disabled:opacity-50"
              >
                {isProcessing ? (
                  <span>Saqlanmoqda...</span>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    <span>Sotuvni Yakunlash va Chek Chiqarish</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
