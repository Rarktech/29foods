"use client";

import { useState } from "react";
import { formatKobo } from "@/lib/format";

export interface ShareablePlanLink {
  url: string;
  durationLabel: string;
  lodge: string;
  amount: number;
}

/** The ready-to-send message a student shares with whoever's paying. */
export function planShareMessage(link: ShareablePlanLink): string {
  return `Hi! I've set up my 29Foods meal plan: ${link.durationLabel} of hot meals delivered to ${link.lodge}, ${formatKobo(
    link.amount,
  )}. Could you pay for it here? 🙏 ${link.url}`;
}

/**
 * After "Ask someone to pay": share the /pay link by the phone's own share menu,
 * straight to WhatsApp with the message pre-filled, or copy it.
 */
export function SharePlanLinkSheet({ link, onClose }: { link: ShareablePlanLink | null; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  if (!link) return null;

  const message = planShareMessage(link);
  const canNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  async function copy() {
    try {
      await navigator.clipboard.writeText(link!.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard blocked — the link is visible in the box to copy by hand
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-[430px] rounded-t-[24px] bg-card p-5 pb-8"
        onClick={(e) => e.stopPropagation()}
        style={{ boxShadow: "0 -8px 28px rgba(0,0,0,0.2)" }}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
        <h3 className="mb-1 text-[17px] font-extrabold text-heading">Send it to whoever&rsquo;s paying</h3>
        <p className="mb-4 text-[12.5px] leading-[1.5] text-muted">
          They don&rsquo;t need an account. They can pay {formatKobo(link.amount)} by card, bank transfer or USSD. The link works for 48 hours, and
          we&rsquo;ll tell you when they open it and when it&rsquo;s paid.
        </p>

        <div className="mb-4 flex items-center gap-2 rounded-[14px] border border-border bg-bg px-3.5 py-3">
          <span className="flex-grow truncate text-[12.5px] font-semibold text-heading">{link.url}</span>
          <button onClick={copy} className="shrink-0 text-[12px] font-bold text-accent">
            {copied ? "Copied ✓" : "Copy"}
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(message)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full rounded-2xl bg-[#25D366] px-5 py-3.5 text-center text-sm font-bold text-white"
          >
            Send on WhatsApp
          </a>
          {canNativeShare && (
            <button
              onClick={() => navigator.share({ title: "29Foods meal plan", text: message }).catch(() => {})}
              className="w-full rounded-2xl bg-accent px-5 py-3.5 text-sm font-bold text-white"
            >
              Share another way…
            </button>
          )}
          <button onClick={onClose} className="w-full py-2 text-[13px] font-bold text-muted">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
