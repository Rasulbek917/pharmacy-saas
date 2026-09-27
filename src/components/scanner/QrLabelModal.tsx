"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { QrCode, Printer, X, RefreshCw, Check, AlertTriangle, ShieldAlert } from "lucide-react";
import QRCode from "qrcode";
import { formatCurrency } from "@/lib/formatters";

interface QrLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  medicine: {
    id: string;
    name: string;
    qrCode?: string | null;
    salePrice?: number;
    unit?: string;
    barcode?: string | null;
    category?: { name: string } | null;
    manufacturer?: { name: string } | null;
  } | null;
  pharmacyName?: string;
  onRegenerate?: (medicineId: string) => Promise<void>;
}

export default function QrLabelModal({
  isOpen,
  onClose,
  medicine,
  pharmacyName = "DORIXONA",
  onRegenerate,
}: QrLabelModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isRegenerating, setIsRegenerating] = useState<boolean>(false);
  const [showRegenConfirm, setShowRegenConfirm] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const printImgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen && medicine?.qrCode) {
      generateQrImage(medicine.qrCode);
    } else {
      setQrDataUrl("");
    }
  }, [isOpen, medicine?.qrCode]);

  const generateQrImage = async (code: string) => {
    setIsGenerating(true);
    setError(null);
    try {
      const url = await QRCode.toDataURL(code, {
        width: 320,
        margin: 1,
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
        errorCorrectionLevel: "M",
      });
      setQrDataUrl(url);
    } catch (err) {
      console.error("QR Code creation error:", err);
      setError("QR kod tasvirini generatsiya qilishda xatolik yuz berdi");
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    if (!qrDataUrl) return;

    const cleanup = () => {
      document.body.classList.remove("printing-qr");
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    document.body.classList.add("printing-qr");

    const doPrint = () => window.print();

    // Ensure the print-only QR image is fully rendered before opening print dialog
    const img = printImgRef.current;
    if (img && !img.complete) {
      img.onload = doPrint;
      img.onerror = doPrint;
    } else {
      doPrint();
    }
  };

  const handleConfirmRegenerate = async () => {
    if (!medicine || !onRegenerate) return;
    setIsRegenerating(true);
    try {
      await onRegenerate(medicine.id);
      setShowRegenConfirm(false);
    } catch (e: any) {
      setError("QR kodni qayta yaratishda xatolik yuz berdi");
    } finally {
      setIsRegenerating(false);
    }
  };

  if (!isOpen || !medicine) return null;

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-3.5 no-print">
          <div className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">Mahsulot QR-Kod Stikeri</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 flex items-center gap-2 no-print">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Regenerate Warning Confirmation */}
          {showRegenConfirm && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900 space-y-2 no-print">
              <div className="flex items-start gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="font-semibold leading-relaxed">
                  Diqqat: Yangi QR kod yaratilsa, avval chop etilgan stikerlar tizimda bekor qilinadi. Qayta yaratishni tasdiqlaysizmi?
                </p>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowRegenConfirm(false)}
                  className="rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100"
                >
                  Bekor qilish
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRegenerate}
                  disabled={isRegenerating}
                  className="rounded-lg px-3 py-1 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50"
                >
                  {isRegenerating ? "Yaratilmoqda..." : "Ha, yangilansin"}
                </button>
              </div>
            </div>
          )}

          {/* THE PRINTABLE QR LABEL CONTAINER (screen preview) */}
          <div
            className="mx-auto w-full max-w-[260px] rounded-xl border border-dashed border-slate-300 bg-white p-4 text-center shadow-sm"
          >
            {/* Pharmacy Small Header */}
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1">
              {pharmacyName}
            </p>

            {/* QR Image */}
            <div className="my-2 flex justify-center items-center">
              {isGenerating ? (
                <div className="h-44 w-44 flex items-center justify-center bg-slate-50 rounded-lg">
                  <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
                </div>
              ) : qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={medicine.qrCode || "QR Code"}
                  className="h-44 w-44 object-contain rounded"
                />
              ) : (
                <div className="h-44 w-44 flex items-center justify-center bg-slate-50 rounded-lg text-xs text-slate-400">
                  QR kod mavjud emas
                </div>
              )}
            </div>

            {/* Medicine Details on Sticker */}
            <div className="space-y-0.5">
              <h4 className="text-xs font-extrabold text-slate-900 leading-tight">
                {medicine.name}
              </h4>

              {medicine.category?.name && (
                <p className="text-[10px] text-slate-500">
                  {medicine.category.name}
                </p>
              )}

              {medicine.salePrice !== undefined && (
                <p className="text-xs font-bold text-emerald-700">
                  {formatCurrency(medicine.salePrice)}
                </p>
              )}

              <p className="text-[9px] font-mono text-slate-400 pt-0.5">
                {medicine.qrCode}
              </p>
            </div>
          </div>

          <p className="text-[11px] text-center text-slate-400 no-print">
            Termal stiker printer (58mm/80mm) yoki qog‘ozga yopishtirish uchun tayyor
          </p>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center gap-2 pt-2 no-print">
            {onRegenerate && !showRegenConfirm && (
              <button
                type="button"
                onClick={() => setShowRegenConfirm(true)}
                className="w-full sm:w-auto flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                title="Yangi unikal QR kod generatsiya qilish"
              >
                <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
                <span>Qayta Yaratish</span>
              </button>
            )}

            <button
              type="button"
              onClick={handlePrint}
              disabled={!qrDataUrl || isGenerating}
              className="w-full sm:w-auto flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-[#16A34A] px-4 py-2 text-xs font-bold text-white hover:bg-[#15803D] transition-colors shadow-md shadow-emerald-600/20 disabled:opacity-50"
            >
              <Printer className="h-4 w-4" />
              <span>Chop Etish</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    {/* Dedicated print-only label, portaled to <body> so modal layout cannot affect print */}
    {mounted &&
      qrDataUrl &&
      createPortal(
        <div className="qr-print-area">
          <p className="qr-print-pharmacy">{pharmacyName}</p>
          <img ref={printImgRef} src={qrDataUrl} alt="QR" className="qr-print-img" />
          <h4 className="qr-print-name">{medicine.name}</h4>
          {medicine.category?.name && <p className="qr-print-cat">{medicine.category.name}</p>}
          {medicine.salePrice !== undefined && (
            <p className="qr-print-price">{formatCurrency(medicine.salePrice)}</p>
          )}
          <p className="qr-print-code">{medicine.qrCode}</p>
        </div>,
        document.body
      )}
    </>
  );
}
