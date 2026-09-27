"use client";

import React, { useEffect, useRef, useState } from "react";
import { Camera, X, AlertCircle } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (code: string) => void;
  title?: string;
}

export default function BarcodeScannerModal({
  isOpen,
  onClose,
  onScanSuccess,
  title = "Mahsulot kodini skanerlang (Shtrix-kod / QR)",
}: BarcodeScannerModalProps) {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const readerElementId = "barcode-scanner-reader";

  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.type = "sine";
      oscillator.frequency.value = 950;
      gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.12);
    } catch (e) {
      // AudioContext may be blocked before gesture
    }
  };

  const cleanupScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (e) {
        // ignore
      }
      scannerRef.current = null;
    }
  };

  const handleClose = async () => {
    await cleanupScanner();
    onClose();
  };

  useEffect(() => {
    if (!isOpen) {
      cleanupScanner();
      return;
    }

    setIsInitializing(true);
    setErrorMsg(null);

    const timer = setTimeout(async () => {
      try {
        // Clean any previous instance first
        await cleanupScanner();

        const el = document.getElementById(readerElementId);
        if (!el) {
          setIsInitializing(false);
          return;
        }

        const scanner = new Html5Qrcode(readerElementId);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 15,
            qrbox: { width: 260, height: 180 },
            aspectRatio: 1.333334,
          },
          async (decodedText) => {
            playBeep();
            const text = decodedText.trim();
            await cleanupScanner();
            onScanSuccess(text);
            onClose();
          },
          () => {
            // Frame error - ignore
          }
        );
        setIsInitializing(false);
      } catch (err: any) {
        setIsInitializing(false);
        setErrorMsg(
          "Kameraga ulanishda xatolik yuz berdi. Iltimos brauzerda kamera ruxsatini yoqing yoki USB skanerdan foydalaning."
        );
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      cleanupScanner();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-4">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-emerald-600" />
            <h3 className="font-bold text-slate-800 text-sm md:text-base">{title}</h3>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Camera Viewfinder */}
        <div className="p-4">
          {errorMsg ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700 flex items-start gap-2.5">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Kamera ruxsati kerak</p>
                <p className="mt-1 leading-relaxed">{errorMsg}</p>
              </div>
            </div>
          ) : (
            <div className="relative overflow-hidden rounded-xl bg-slate-950 aspect-[4/3] flex items-center justify-center border-2 border-emerald-500/30">
              <div id={readerElementId} className="w-full h-full" />
              {isInitializing && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 text-white text-xs gap-2.5">
                  <div className="h-7 w-7 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                  <span className="font-medium">Kamera ishga tushirilmoqda...</span>
                </div>
              )}
            </div>
          )}

          <p className="mt-3 text-center text-xs text-slate-500">
            Dori qutisidagi 1D shtrix-kod yoki QR kodni ramka ichiga qarating. Kod aniqlangach, avtomatik qabul qilinadi.
          </p>
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-slate-100 bg-slate-50 px-5 py-3">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Bekor qilish
          </button>
        </div>
      </div>
    </div>
  );
}
