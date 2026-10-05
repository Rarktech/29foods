"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { PAYER_MESSAGE_MAX } from "@29foods/core";
import { formatKobo } from "@/lib/format";
import { SharePlanLinkSheet } from "@/components/SharePlanLinkSheet";
import logo from "@/public/images/brand/logo.png";

export interface PayRequestDetails {
  code: string;
  status: "pending" | "paid" | "expired" | "cancelled";
  requesterFirstName: string;
  requesterUserId: string;
  durationLabel: string;
  lodge: string;
  meals: { label: string; dishes: string[]; addon: string | null }[];
  amount: number;
  expiresAt: string;
  payerName: string | null;
  payerEmail: string | null;
  payerMessage: string | null;
  paidAt: string | null;
  planStart: string;
  planEnd: string;
}

function hoursLeft(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  const h = Math.max(0, Math.floor(ms / 3_600_000));
  return h >= 1 ? `${h} hour${h === 1 ? "" : "s"}` : "less than an hour";
}

function longDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

/** The public pay page: plan summary + payer form, then a receipt once paid. */
export function PayRequestView({
  details,
  viewerIsRequester,
  returnedFromCheckout,
}: {
  details: PayRequestDetails;
  viewerIsRequester: boolean;
  returnedFromCheckout: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(details.status);
  const [confirming, setConfirming] = useState(returnedFromCheckout && details.status === "pending");
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const name = details.requesterFirstName;

  // First real open (not the student, not a link-preview crawler) → tell the student.
  useEffect(() => {
    if (!viewerIsRequester && details.status === "pending") void fetch(`/api/pay/${details.code}/opened`, { method: "POST" }).catch(() => {});
  }, [details.code, details.status, viewerIsRequester]);

  // Back from checkout: wait for the webhook to confirm, then show the receipt.
  useEffect(() => {
    if (!confirming) return;
    let attempts = 0;
    let cancelled = false;
    const poll = async () => {
      attempts += 1;
      try {
        const res = await fetch(`/api/pay/${details.code}`, { cache: "no-store" });
        const body = (await res.json()) as { status?: PayRequestDetails["status"] };
        if (cancelled) return;
        if (body.status === "paid") {
          setStatus("paid");
          setConfirming(false);
          router.refresh(); // pull payer name / paid date for the receipt
          return;
        }
      } catch {
        // network blip — try again
      }
      if (attempts < 20) setTimeout(poll, 3000);
      else setConfirming(false);
    };
    void poll();
    return () => {
      cancelled = true;
    };
  }, [confirming, details.code, router]);

  useEffect(() => setStatus(details.status), [details.status]);

  async function pay() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/pay/${details.code}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = (await res.json()) as { error?: string; checkoutUrl?: string };
      if (!res.ok || !body.checkoutUrl) throw new Error(body.error ?? "Something went wrong. Please try again.");
      window.location.href = body.checkoutUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  const planCard = (
    <div className="mb-5 rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <span className="text-[15px] font-extrabold text-heading">{details.durationLabel} meal plan</span>
        <span className="text-[17px] font-extrabold tabular-nums text-heading">{formatKobo(details.amount)}</span>
      </div>
      <div className="mb-3 flex flex-col gap-2">
        {details.meals.map((meal) => (
          <div key={meal.label}>
            <div className="text-[10.5px] font-bold uppercase tracking-[0.05em] text-muted">{meal.label}</div>
            {meal.dishes.map((d) => (
              <div key={d} className="text-[13px] font-semibold text-body">
                {d}
              </div>
            ))}
            {meal.addon && <div className="text-[12px] text-muted">+ {meal.addon} with each</div>}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 border-t border-border pt-3 text-[12.5px] text-muted">
        <span>📍</span>
        <span>
          Delivered to <strong className="text-heading">{details.lodge}</strong>
        </span>
      </div>
    </div>
  );

  return (
    <div className="scrollbar-none flex-grow overflow-y-auto px-5 pb-10 pt-5">
      <div className="mb-5 flex items-center gap-2.5">
        <Image src={logo} alt="29Foods" width={34} height={34} className="h-[34px] w-[34px] object-contain" />
        <span className="text-[16px] font-extrabold text-heading">29Foods</span>
      </div>

      {status === "paid" ? (
        <>
          <div className="mb-5 rounded-2xl bg-success-bg p-4 text-center">
            <div className="mb-1 text-[28px]">🎉</div>
            <h1 className="mb-1 text-[19px] font-extrabold text-heading">
              {viewerIsRequester ? "Your plan is paid for!" : `Thank you! ${name}'s plan is paid for.`}
            </h1>
            <p className="text-[12.5px] text-body">
              {viewerIsRequester ? "Your meals start today." : `${name} has been told, and their meals start today.`}
            </p>
          </div>

          {/* Receipt */}
          <div className="mb-4 rounded-2xl border border-border bg-card p-4" id="receipt">
            <h2 className="mb-3 text-[13px] font-extrabold uppercase tracking-[0.05em] text-muted">Receipt</h2>
            <ReceiptRow label="Amount paid" value={formatKobo(details.amount)} strong />
            <ReceiptRow label="For" value={`${name}'s ${details.durationLabel} meal plan`} />
            <ReceiptRow label="Plan dates" value={`${longDate(details.planStart)} → ${longDate(details.planEnd)}`} />
            {details.payerName && <ReceiptRow label="Paid by" value={details.payerName} />}
            {details.paidAt && <ReceiptRow label="Date" value={longDate(details.paidAt)} />}
            <ReceiptRow label="Reference" value={details.code} />
            {details.payerMessage && <p className="mt-3 rounded-xl bg-bg px-3 py-2.5 text-[12.5px] italic text-body">&ldquo;{details.payerMessage}&rdquo;</p>}
          </div>
          {!viewerIsRequester && details.payerEmail && (
            <p className="mb-4 text-center text-[11.5px] text-muted">A payment receipt was also emailed to {details.payerEmail}.</p>
          )}
          <button onClick={() => window.print()} className="w-full rounded-2xl border border-border px-5 py-3 text-[13px] font-bold text-heading">
            Save or print receipt
          </button>
        </>
      ) : status === "expired" || status === "cancelled" ? (
        <div className="rounded-2xl border border-border bg-card p-5 text-center">
          <h1 className="mb-1.5 text-[17px] font-extrabold text-heading">This link is no longer active</h1>
          <p className="text-[12.5px] leading-[1.55] text-muted">
            {status === "cancelled" ? `${name} cancelled this request.` : "It expired before it was paid."} Nothing was charged.
            {viewerIsRequester ? " You can make a new one from the meal plan screen." : ` Ask ${name} to send a fresh link.`}
          </p>
        </div>
      ) : confirming ? (
        <div className="rounded-2xl border border-border bg-card p-6 text-center">
          <h1 className="mb-1.5 text-[17px] font-extrabold text-heading">Confirming your payment…</h1>
          <p className="text-[12.5px] text-muted">This usually takes a few seconds. You can keep this page open.</p>
        </div>
      ) : viewerIsRequester ? (
        <>
          <h1 className="mb-1 text-[20px] font-extrabold leading-tight text-heading">Waiting for someone to pay</h1>
          <p className="mb-5 text-[12.5px] text-muted">This is your link. It works for another {hoursLeft(details.expiresAt)}.</p>
          {planCard}
          <button onClick={() => setShareOpen(true)} className="w-full rounded-2xl bg-accent px-5 py-3.5 text-sm font-bold text-white">
            Share the link again
          </button>
          <SharePlanLinkSheet
            link={shareOpen ? { url: window.location.origin + `/pay/${details.code}`, durationLabel: details.durationLabel, lodge: details.lodge, amount: details.amount } : null}
            onClose={() => setShareOpen(false)}
          />
        </>
      ) : (
        <>
          <h1 className="mb-1 text-[21px] font-extrabold leading-tight text-heading">{name} asked you to pay for their meal plan 💛</h1>
          <p className="mb-5 text-[12.5px] leading-[1.55] text-muted">
            Hot meals delivered straight to {name}&rsquo;s lodge. No account needed. This link works for another {hoursLeft(details.expiresAt)}.
          </p>
          {planCard}

          <div className="mb-4 flex flex-col gap-2.5">
            <Field label="Your name">
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Mum"
                autoComplete="name"
                className="w-full bg-transparent text-[14px] font-semibold text-heading outline-none"
              />
            </Field>
            <Field label="Email, for your receipt">
              <input
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="you@example.com"
                type="email"
                autoComplete="email"
                className="w-full bg-transparent text-[14px] font-semibold text-heading outline-none"
              />
            </Field>
            <Field label={`A note for ${name} (optional)`}>
              <textarea
                value={form.message}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value.slice(0, PAYER_MESSAGE_MAX) }))}
                placeholder="Eat well, love you"
                rows={2}
                className="w-full resize-none bg-transparent text-[14px] font-semibold text-heading outline-none"
              />
              <div className="text-right text-[10.5px] text-muted">
                {form.message.length}/{PAYER_MESSAGE_MAX}
              </div>
            </Field>
          </div>

          {error && <p className="mb-2 text-[12px] font-semibold text-accent">{error}</p>}
          <button
            onClick={pay}
            disabled={submitting || !form.name.trim() || !form.email.trim()}
            className="mb-2 w-full rounded-2xl bg-accent px-5 py-4 text-[14.5px] font-bold text-white disabled:opacity-60"
          >
            {submitting ? "Opening secure checkout…" : `Pay ${formatKobo(details.amount)}`}
          </button>
          <p className="text-center text-[11px] text-muted">Secure payment by card, bank transfer or USSD via Flutterwave.</p>
        </>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block rounded-[14px] border-[1.5px] border-border bg-card px-4 py-2.5">
      <span className="mb-0.5 block text-[10.5px] font-bold uppercase tracking-[0.04em] text-muted">{label}</span>
      {children}
    </label>
  );
}

function ReceiptRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-3 border-b border-border py-2 text-[12.5px] last:border-0">
      <span className="text-muted">{label}</span>
      <span className={`text-right ${strong ? "font-extrabold text-heading" : "font-semibold text-body"}`}>{value}</span>
    </div>
  );
}
