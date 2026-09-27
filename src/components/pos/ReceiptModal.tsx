"use client";

import React, { useState } from "react";
import { Printer, Check, X, AlertTriangle, RefreshCw, Cpu, FileText } from "lucide-react";
import { formatCurrency, formatDateTime, getPaymentMethodLabel } from "@/lib/formatters";
import {
  generateEscPosBytes,
  printDirectWebSerial,
  printViaLocalBridge,
  PaperWidth,
} from "@/lib/escpos";

interface ReceiptItem {
  medicineName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  totalPrice: number;
}

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  receipt: {
    id?: string;
    receiptNumber: string;
    pharmacyName: string;
    pharmacyPhone?: string;
    pharmacyAddress?: string;
    cashierName: string;
    createdAt?: string;
    totalAmount: number;
    discountAmount: number;
    taxRate?: number;
    taxAmount?: number;
    payableAmount: number;
    paidAmount: number;
    changeAmount: number;
    paymentMethod: string;
    items: ReceiptItem[];
  } | null;
  isReprint?: boolean;
}

export default function ReceiptModal({ isOpen, onClose, receipt, isReprint = false }: ReceiptModalProps) {
  const [paperWidth, setPaperWidth] = useState<PaperWidth>("58mm");
  const [isPrintingEscPos, setIsPrintingEscPos] = useState(false);
  const [printStatus, setPrintStatus] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  if (!isOpen || !receipt) return null;

  // 1. Direct ESC/POS printing (Web Serial / USB / Local Bridge)
  const handleDirectEscPosPrint = async () => {
    setIsPrintingEscPos(true);
    setPrintStatus({ type: "info", message: "Termal printerga ulanmoqda..." });

    try {
      const bytes = generateEscPosBytes(
        {
          receiptNumber: receipt.receiptNumber,
          pharmacyName: receipt.pharmacyName,
          pharmacyPhone: receipt.pharmacyPhone,
          pharmacyAddress: receipt.pharmacyAddress,
          cashierName: receipt.cashierName,
          createdAt: receipt.createdAt,
          totalAmount: receipt.totalAmount,
          discountAmount: receipt.discountAmount,
          taxRate: receipt.taxRate,
          taxAmount: receipt.taxAmount,
          payableAmount: receipt.payableAmount,
          paidAmount: receipt.paidAmount,
          changeAmount: receipt.changeAmount,
          paymentMethod: receipt.paymentMethod,
          items: receipt.items,
        },
        { paperWidth, openDrawer: true, cutPaper: true }
      );

      // Try local bridge first (fastest and most reliable for POS terminals)
      const bridgeRes = await printViaLocalBridge(bytes);
      if (bridgeRes.success) {
        setPrintStatus({ type: "success", message: bridgeRes.message });
        setIsPrintingEscPos(false);
        return;
      }

      // If no local bridge, try Web Serial API
      const serialRes = await printDirectWebSerial(bytes);
      if (serialRes.success) {
        setPrintStatus({ type: "success", message: serialRes.message });
      } else {
        setPrintStatus({
          type: "error",
          message: `To‘g‘ridan-to‘g‘ri termal printerga ulanib bo‘lmadi: ${serialRes.message}. Brauzer printeri orqali chop etishdan foydalanishingiz mumkin.`,
        });
      }
    } catch (err: any) {
      setPrintStatus({
        type: "error",
        message: "Termal printer xatoligi. Savdo saqlangan, lekin chek chiqarilmadi.",
      });
    } finally {
      setIsPrintingEscPos(false);
    }
  };

  // 2. Standard Browser Print (Continuous Thermal Receipt)
  const handleStandardPrint = () => {
    document.body.classList.add("printing-receipt");
    window.print();
    setTimeout(() => {
      document.body.classList.remove("printing-receipt");
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* Header Actions */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-3.5 no-print">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
            <Check className="h-4 w-4" />
            {isReprint ? "Chekni Qayta Chop Etish" : "Sotuv Muvaffaqiyatli"}
          </span>

          <div className="flex items-center gap-2">
            {/* Paper Width Toggle */}
            <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 text-[10px] font-bold">
              <button
                type="button"
                onClick={() => setPaperWidth("58mm")}
                className={`rounded px-1.5 py-0.5 transition-colors ${
                  paperWidth === "58mm" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                58 mm
              </button>
              <button
                type="button"
                onClick={() => setPaperWidth("80mm")}
                className={`rounded px-1.5 py-0.5 transition-colors ${
                  paperWidth === "80mm" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                80 mm
              </button>
            </div>

            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Printer Status Banner if any */}
        {printStatus && (
          <div
            className={`px-4 py-2.5 text-xs font-medium no-print flex items-center justify-between ${
              printStatus.type === "success"
                ? "bg-emerald-50 text-emerald-800 border-b border-emerald-100"
                : printStatus.type === "error"
                ? "bg-amber-50 text-amber-900 border-b border-amber-200"
                : "bg-blue-50 text-blue-800 border-b border-blue-100"
            }`}
          >
            <div className="flex items-center gap-2">
              {printStatus.type === "error" && <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />}
              {printStatus.type === "success" && <Check className="h-4 w-4 shrink-0 text-emerald-600" />}
              <span>{printStatus.message}</span>
            </div>
            {printStatus.type === "error" && (
              <button
                onClick={handleDirectEscPosPrint}
                className="ml-2 text-xs font-bold text-amber-800 underline hover:text-amber-900"
              >
                Qayta urinish
              </button>
            )}
          </div>
        )}

        {/* Printable Thermal Receipt Container */}
        <div
          className={`p-6 bg-white max-h-[65vh] overflow-y-auto transition-all ${
            paperWidth === "58mm" ? "max-w-[280px] mx-auto text-[11px]" : "max-w-full text-xs"
          }`}
          id="printable-receipt"
        >
          {/* Pharmacy Header */}
          <div className="text-center border-b border-dashed border-slate-300 pb-3">
            <h2 className="text-sm md:text-base font-extrabold tracking-tight text-slate-900 uppercase">
              {receipt.pharmacyName}
            </h2>
            {receipt.pharmacyAddress && (
              <p className="text-[10px] text-slate-500 mt-0.5">{receipt.pharmacyAddress}</p>
            )}
            {receipt.pharmacyPhone && (
              <p className="text-[10px] text-slate-500">Tel: {receipt.pharmacyPhone}</p>
            )}
          </div>

          {/* Receipt Info */}
          <div className="py-2.5 text-[11px] text-slate-600 border-b border-dashed border-slate-300 space-y-0.5">
            <div className="flex justify-between">
              <span>Chek raqami:</span>
              <span className="font-bold text-slate-900">{receipt.receiptNumber}</span>
            </div>
            <div className="flex justify-between">
              <span>Sana va vaqt:</span>
              <span>{formatDateTime(receipt.createdAt || new Date())}</span>
            </div>
            <div className="flex justify-between">
              <span>Kassir:</span>
              <span className="font-medium text-slate-800">{receipt.cashierName}</span>
            </div>
            <div className="flex justify-between">
              <span>To‘lov turi:</span>
              <span className="font-medium text-slate-800">
                {getPaymentMethodLabel(receipt.paymentMethod)}
              </span>
            </div>
            {isReprint && (
              <div className="text-center font-bold text-amber-600 text-[10px] pt-1">
                * NUSXA / QAYTA CHOP ETILGAN CHEK *
              </div>
            )}
          </div>

          {/* Items Table */}
          <div className="py-3 border-b border-dashed border-slate-300">
            <div className="flex justify-between text-[11px] font-bold text-slate-900 mb-1.5">
              <span>Mahsulot</span>
              <span>Summa</span>
            </div>

            <div className="space-y-2 text-[11px]">
              {receipt.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-start">
                  <div className="pr-2">
                    <p className="font-semibold text-slate-800">{item.medicineName}</p>
                    <p className="text-[10px] text-slate-500">
                      {formatCurrency(item.unitPrice)} × {item.quantity}
                      {item.discount > 0 && ` (-${formatCurrency(item.discount)})`}
                    </p>
                  </div>
                  <span className="font-bold text-slate-900 shrink-0">
                    {formatCurrency(item.totalPrice)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Calculations Summary */}
          <div className="pt-3 text-[11px] space-y-1">
            <div className="flex justify-between text-slate-600">
              <span>Jami qiymat:</span>
              <span>{formatCurrency(receipt.totalAmount)}</span>
            </div>

            {receipt.discountAmount > 0 && (
              <div className="flex justify-between text-red-600 font-semibold">
                <span>Chegirma:</span>
                <span>-{formatCurrency(receipt.discountAmount)}</span>
              </div>
            )}

            {!!receipt.taxAmount && receipt.taxAmount > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>QQS{receipt.taxRate ? ` (${receipt.taxRate}%)` : ""}:</span>
                <span>{formatCurrency(receipt.taxAmount)}</span>
              </div>
            )}

            <div className="flex justify-between text-xs md:text-sm font-extrabold text-slate-900 pt-1 border-t border-slate-200">
              <span>To‘lov summasi:</span>
              <span className="text-emerald-700">{formatCurrency(receipt.payableAmount)}</span>
            </div>

            <div className="flex justify-between text-slate-600 pt-1 text-[11px]">
              <span>Qabul qilindi:</span>
              <span>{formatCurrency(receipt.paidAmount)}</span>
            </div>

            {receipt.changeAmount > 0 && (
              <div className="flex justify-between text-slate-800 font-bold text-[11px]">
                <span>Qaytim:</span>
                <span>{formatCurrency(receipt.changeAmount)}</span>
              </div>
            )}
          </div>

          {/* Footer message */}
          <div className="mt-5 text-center text-[10px] text-slate-400 border-t border-dashed border-slate-200 pt-3">
            <p>Xaridingiz uchun tashakkur!</p>
            <p className="mt-0.5 font-medium text-slate-500">Salomat bo‘ling!</p>
          </div>
        </div>

        {/* Modal Action Buttons Footer */}
        <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50 p-4 no-print">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleDirectEscPosPrint}
              disabled={isPrintingEscPos}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50"
            >
              <Cpu className="h-4 w-4" />
              <span>{isPrintingEscPos ? "Yuborilmoqda..." : "ESC/POS Termal"}</span>
            </button>

            <button
              onClick={handleStandardPrint}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors shadow-sm"
            >
              <Printer className="h-4 w-4" />
              <span>Standart Chop</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="w-full rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition-colors shadow-sm"
          >
            Yopish va yangi sotuvga o‘tish
          </button>
        </div>
      </div>
    </div>
  );
}
