"use client";

import { useEffect } from "react";

/** Registers the static-asset cache worker after the page settles — never blocks first paint. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Installability/caching is a progressive enhancement — never break the app if this fails.
      });
    });
  }, []);

  return null;
}
