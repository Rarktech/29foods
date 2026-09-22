"use client";

import { useEffect } from "react";

/** Registers the static-asset cache worker after the page settles — never blocks first paint. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    // Dev builds don't content-hash every asset path the SW cache-firsts (e.g. /images/),
    // so registering in dev can serve a stale chunk after a code change until manually
    // unregistered — exactly the bug that cost us a debugging session earlier. Production
    // asset URLs are hashed, so cache-first there is safe.
    if (process.env.NODE_ENV !== "production") return;
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Installability/caching is a progressive enhancement — never break the app if this fails.
      });
    });
  }, []);

  return null;
}
