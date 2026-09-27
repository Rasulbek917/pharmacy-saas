"use client";

import { useEffect, useRef } from "react";

interface UsbBarcodeDetectorProps {
  onScan: (barcode: string) => void;
  enabled?: boolean;
}

export default function UsbBarcodeDetector({ onScan, enabled = true }: UsbBarcodeDetectorProps) {
  const bufferRef = useRef<string>("");
  const lastKeyTimeRef = useRef<number>(0);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const flushBuffer = () => {
      const code = bufferRef.current.trim();
      bufferRef.current = "";
      if (code.length >= 3) {
        onScan(code);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in regular text inputs unless specifically tagged
      const target = e.target as HTMLElement;
      const isRegularInput =
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) &&
        !target.getAttribute("data-barcode-listener");

      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTimeRef.current;
      lastKeyTimeRef.current = currentTime;

      // 1. Enter key marks end of scan
      if (e.key === "Enter") {
        if (bufferRef.current.length >= 3) {
          e.preventDefault();
          if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
          flushBuffer();
        } else {
          bufferRef.current = "";
        }
        return;
      }

      // 2. Barcode scanners send keystrokes in rapid succession (< 80ms)
      if (e.key.length === 1) {
        if (timeDiff > 120 && !isRegularInput) {
          // If slow typing by human, reset buffer
          bufferRef.current = e.key;
        } else {
          bufferRef.current += e.key;
        }

        // 3. For scanners configured without Enter suffix:
        // Set a 160ms debounce timeout to flush if key was rapidly scanned
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        if (bufferRef.current.length >= 4 && timeDiff < 80) {
          debounceTimerRef.current = setTimeout(() => {
            flushBuffer();
          }, 160);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [enabled, onScan]);

  return null;
}
