"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  formatKobo,
  formatNairaInput,
  parseNairaAmount,
  WALLET_TOPUP_PRESETS_KOBO,
  WALLET_TOPUP_MIN_KOBO,
  WALLET_TOPUP_MAX_KOBO,
} from "@29foods/core";

/** Kobo → the amount field's text, e.g. 520050 → "5,200.50". */
function koboToInput(kobo: number): string {
  return formatNairaInput(kobo % 100 === 0 ? String(kobo / 100) : (kobo / 100).toFixed(2));
}
import { FUNDING_METHODS, type FundingMethodId, type TopupReturnPath } from "@/lib/funding-methods";

/**
 * Bottom sheet for funding the wallet: pick an amount (presets or typed), pick how to
 * pay, then hand off to that provider's checkout. Used from the You page and from the
 * cart when the balance doesn't cover an order.
 */
export function WalletFundSheet({
  open,
  onClose,
  returnTo,
  suggestedAmountKobo,
}: {
  open: boolean;
  onClose: () => void;
  returnTo: TopupReturnPath;
  /** Pre-selects this amount (e.g. the shortfall on a cart order). */
  suggestedAmountKobo?: number;
}) {
  const enabledMethods = FUNDING_METHODS.filter((m) => m.enabled);
  const [amountText, setAmountText] = useState("");
  const [method, setMethod] = useState<FundingMethodId>(enabledMethods[0]!.id);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setSubmitting(false);
    // Exactly the shortfall, kobo included, so the top-up covers the order to the kobo.
    if (suggestedAmountKobo) setAmountText(koboToInput(Math.max(suggestedAmountKobo, WALLET_TOPUP_MIN_KOBO)));
  }, [open, suggestedAmountKobo]);

  if (!open) return null;

  const amountKobo = parseNairaAmount(amountText);
  const amountValid = amountKobo !== null && amountKobo >= WALLET_TOPUP_MIN_KOBO && amountKobo <= WALLET_TOPUP_MAX_KOBO;

  async function continueToCheckout() {
    if (!amountValid) {
      setError(`Enter an amount between ${formatKobo(WALLET_TOPUP_MIN_KOBO)} and ${formatKobo(WALLET_TOPUP_MAX_KOBO)}.`);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/wallet/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountKobo, method, returnTo }),
      });
      const body = (await response.json()) as { error?: string; checkoutUrl?: string };
      if (!response.ok || !body.checkoutUrl) throw new Error(body.error ?? "Something went wrong. Please try again.");
      window.location.href = body.checkoutUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setSubmitting(false);
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
        <h3 className="mb-1 text-[17px] font-extrabold text-heading">Fund your wallet</h3>
        <p className="mb-4 text-[12.5px] leading-[1.5] text-muted">Top up once, then pay for orders in one tap.</p>

        <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.04em] text-muted">Amount</label>
        <div className="mb-2.5 flex gap-2">
          {WALLET_TOPUP_PRESETS_KOBO.map((preset) => {
            const active = amountKobo === preset;
            return (
              <button
                key={preset}
                type="button"
                onClick={() => setAmountText(koboToInput(preset))}
                className="flex-1 rounded-full px-2 py-2 text-[12.5px] font-bold"
                style={{
                  background: active ? "rgb(var(--color-accent))" : "rgb(var(--color-bg))",
                  color: active ? "#FFFFFF" : "rgb(var(--color-heading))",
                  border: active ? "1.5px solid rgb(var(--color-accent))" : "1.5px solid rgb(var(--color-border))",
                }}
              >
                {formatKobo(preset)}
              </button>
            );
          })}
        </div>
        <div className="mb-4 flex items-center gap-2 rounded-[14px] border-[1.5px] border-border bg-bg px-4 py-3">
          <span className="text-[15px] font-extrabold text-muted">₦</span>
          <input
            value={amountText}
            onChange={(e) => setAmountText(formatNairaInput(e.target.value))}
            inputMode="decimal"
            placeholder="Or type an amount"
            className="w-full border-none bg-transparent text-[15px] font-bold text-heading outline-none"
          />
        </div>

        <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.04em] text-muted">Fund with</label>
        <div className="mb-4 flex flex-col gap-2">
          {enabledMethods.map((m) => {
            const active = m.id === method;
            return (
              <label
                key={m.id}
                className="flex cursor-pointer items-center gap-3 rounded-[14px] px-4 py-3.5"
                style={{
                  background: active ? "rgb(var(--color-accent-tint))" : "rgb(var(--color-card))",
                  border: active ? "1.5px solid rgb(var(--color-accent))" : "1.5px solid rgb(var(--color-border))",
                }}
              >
                <input type="radio" name="funding-method" checked={active} onChange={() => setMethod(m.id)} className="sr-only" />
                <div className="flex h-6 w-[34px] shrink-0 items-center justify-center rounded-[5px] bg-heading text-[9px] font-extrabold text-[#FFB25C]">
                  {m.badge}
                </div>
                <div className="flex-grow">
                  <span className="block text-[13.5px] font-bold text-heading">{m.label}</span>
                  <span className="block text-[11px] text-muted">{m.description}</span>
                </div>
                {active && <CheckDot />}
              </label>
            );
          })}
        </div>

        {error && <p className="mb-2 text-[12px] font-semibold text-accent">{error}</p>}

        <button
          onClick={continueToCheckout}
          disabled={submitting || !amountValid}
          className="w-full rounded-2xl bg-accent px-5 py-3.5 text-sm font-bold text-white disabled:opacity-60"
        >
          {submitting ? "Opening checkout…" : amountValid ? `Add ${formatKobo(amountKobo!)}` : "Enter an amount"}
        </button>
      </div>
    </div>
  );
}

export function CheckDot() {
  return (
    <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-accent">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6 9 17l-5-5" />
      </svg>
    </span>
  );
}

export type TopupReturnState = "idle" | "confirming" | "credited" | "slow";

/**
 * When the customer lands back here from a top-up checkout (?topup=<tx_ref>), polls
 * until the webhook has credited the wallet, then reports the new balance. Gives up
 * quietly after ~45s — the credit still lands, it just shows on the next visit.
 */
export function useTopupReturn(initialBalance: number) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const txRef = searchParams.get("topup");
  const [balance, setBalance] = useState(initialBalance);
  const [state, setState] = useState<TopupReturnState>(txRef ? "confirming" : "idle");
  const [creditedAmount, setCreditedAmount] = useState<number | null>(null);

  useEffect(() => setBalance(initialBalance), [initialBalance]);

  useEffect(() => {
    if (!txRef) return;
    let cancelled = false;
    let attempts = 0;
    const poll = async () => {
      attempts += 1;
      try {
        const response = await fetch(`/api/wallet?topup=${encodeURIComponent(txRef)}`, { cache: "no-store" });
        const body = (await response.json()) as { balance: number; topup: { status: string; amount: number } | null };
        if (cancelled) return;
        setBalance(body.balance);
        if (body.topup?.status === "completed") {
          setState("credited");
          setCreditedAmount(body.topup.amount);
          router.replace(pathname, { scroll: false }); // drop ?topup so a refresh doesn't re-poll
          router.refresh();
          return;
        }
      } catch {
        // network blip — try again on the next tick
      }
      if (attempts >= 15) setState("slow");
      else setTimeout(poll, 3000);
    };
    void poll();
    return () => {
      cancelled = true;
    };
  }, [txRef, pathname, router]);

  return { balance, state, creditedAmount };
}
