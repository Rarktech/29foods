"use client";

import { useEffect, useState } from "react";

const DISMISSED_KEY = "29foods.install-dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [visible, setVisible] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    const alreadyInstalled = window.matchMedia("(display-mode: standalone)").matches;
    if (alreadyInstalled) return;

    let dismissed = false;
    try {
      dismissed = window.localStorage.getItem(DISMISSED_KEY) === "1";
    } catch {
      // storage unavailable — just don't persist the dismissal, not worth blocking on
    }
    if (dismissed) return;

    const ua = window.navigator.userAgent;
    const iosDevice = /iPhone|iPad|iPod/.test(ua) && !("MSStream" in window);
    setIsIos(iosDevice);
    if (iosDevice) setVisible(true); // iOS never fires beforeinstallprompt — show instructions-only

    function onBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);

    function onInstalled() {
      setVisible(false);
      dismiss();
    }
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function dismiss() {
    setVisible(false);
    setSheetOpen(false);
    try {
      window.localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // best-effort only
    }
  }

  async function handleInstallClick() {
    if (!deferredPrompt) {
      setSheetOpen(true); // iOS (or a browser that hasn't fired the event yet) — show manual steps
      return;
    }
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    if (outcome === "accepted") dismiss();
    else setVisible(false);
  }

  if (!visible) return null;

  return (
    <>
      <button
        onClick={handleInstallClick}
        className="mx-5 mb-4 flex items-center gap-2.5 rounded-full border border-border bg-card px-4 py-2.5"
      >
        <span className="h-2 w-2 shrink-0 rounded-full bg-success" />
        <span className="flex-grow text-left text-[13px] font-bold text-heading">Install App</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--color-accent))" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
          <path d="M12 3v12" />
          <path d="m7 10 5 5 5-5" />
          <path d="M5 21h14" />
        </svg>
        <span
          role="button"
          aria-label="Dismiss install prompt"
          onClick={(e) => {
            e.stopPropagation();
            dismiss();
          }}
          className="ml-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-muted"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </span>
      </button>

      {sheetOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={() => setSheetOpen(false)}>
          <div
            className="w-full max-w-[430px] rounded-t-[24px] bg-card p-5 pb-8"
            onClick={(e) => e.stopPropagation()}
            style={{ boxShadow: "0 -8px 28px rgba(0,0,0,0.2)" }}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
            <h3 className="mb-2 text-[17px] font-extrabold text-heading">Install 29Foods</h3>
            {isIos ? (
              <>
                <p className="mb-4 text-[13px] leading-[1.6] text-body">
                  Add 29Foods to your home screen for one-tap ordering, just like an app.
                </p>
                <ol className="mb-5 flex flex-col gap-3 text-[13px] text-body">
                  <li className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-tint text-[11px] font-extrabold text-accent">1</span>
                    <span>
                      Tap the <strong>Share</strong> icon in Safari&rsquo;s toolbar
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-tint text-[11px] font-extrabold text-accent">2</span>
                    <span>
                      Scroll down and tap <strong>Add to Home Screen</strong>
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-tint text-[11px] font-extrabold text-accent">3</span>
                    <span>
                      Tap <strong>Add</strong> to confirm
                    </span>
                  </li>
                </ol>
                <button onClick={dismiss} className="w-full rounded-2xl bg-accent px-5 py-3.5 text-sm font-bold text-white">
                  Got it
                </button>
              </>
            ) : (
              <>
                <p className="mb-5 text-[13px] leading-[1.6] text-body">
                  Your browser doesn&rsquo;t support one-tap installs right now. Look for &ldquo;Add to Home screen&rdquo; or &ldquo;Install app&rdquo; in your browser&rsquo;s menu.
                </p>
                <button onClick={dismiss} className="w-full rounded-2xl bg-accent px-5 py-3.5 text-sm font-bold text-white">
                  Got it
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
