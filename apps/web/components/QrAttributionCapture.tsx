"use client";

import { useEffect } from "react";

const STORAGE_KEY = "29foods.source_qr";

/** Persists the ?src= lodge QR code client-side so checkout/signup can attribute the order later. */
export function QrAttributionCapture({ qrCode }: { qrCode: string }) {
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, qrCode);
    } catch {
      // storage unavailable — attribution is best-effort, never block the page for it
    }
  }, [qrCode]);

  return null;
}

export function readStoredSourceQr(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}
