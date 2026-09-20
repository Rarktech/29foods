"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart-context";
import { formatKobo } from "@/lib/format";
import { calculateDeliveryFee } from "@/lib/pricing";
import { readStoredSourceQr } from "@/components/QrAttributionCapture";

export function CheckoutForm(props: {
  savedLodge: string | null;
  savedRoom: string | null;
  userEmail: string | null;
  userName: string | null;
  userPhone: string | null;
}) {
  const { lines, subtotal, clear } = useCart();
  const router = useRouter();
  const [lodge, setLodge] = useState(props.savedLodge ?? "");
  const [room, setRoom] = useState(props.savedRoom ?? "");
  const [phone, setPhone] = useState(props.userPhone ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deliveryFee = calculateDeliveryFee(subtotal);
  const total = subtotal + deliveryFee;
  const remainingForFreeDelivery = deliveryFee > 0 ? 300000 - subtotal : 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!lodge.trim()) {
      setError("Please enter your lodge.");
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: lines.map((l) => ({ menuItemId: l.menuItemId, name: l.name, qty: l.qty, unitPrice: l.unitPrice })),
          lodge: lodge.trim(),
          room: room.trim() || null,
          phone: phone.trim() || null,
          sourceQr: readStoredSourceQr(),
        }),
      });

      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Something went wrong. Please try again.");

      clear();
      window.location.href = body.paymentLink; // Flutterwave hosted checkout
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">Lodge</label>
        <input
          value={lodge}
          onChange={(e) => setLodge(e.target.value)}
          placeholder="e.g. Peace Lodge"
          className="w-full rounded-xl border border-neutral-200 px-4 py-3"
          required
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">Room (optional)</label>
        <input
          value={room}
          onChange={(e) => setRoom(e.target.value)}
          placeholder="e.g. Rm 12"
          className="w-full rounded-xl border border-neutral-200 px-4 py-3"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">
          Phone <span className="font-normal text-neutral-400">(optional — so the rider can call you)</span>
        </label>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="e.g. 08012345678"
          type="tel"
          className="w-full rounded-xl border border-neutral-200 px-4 py-3"
        />
      </div>

      <div className="rounded-2xl border border-neutral-100 bg-white p-4">
        <div className="flex justify-between text-sm text-neutral-600">
          <span>Subtotal</span>
          <span>{formatKobo(subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm text-neutral-600">
          <span>Delivery fee</span>
          <span>{deliveryFee === 0 ? "Free" : formatKobo(deliveryFee)}</span>
        </div>
        {remainingForFreeDelivery > 0 && (
          <p className="mt-2 text-xs text-brand-600">
            Spend {formatKobo(remainingForFreeDelivery)} more for free delivery 🎉
          </p>
        )}
        <div className="mt-2 flex justify-between border-t border-neutral-100 pt-2 font-semibold">
          <span>Total</span>
          <span>{formatKobo(total)}</span>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting || lines.length === 0}
        className="rounded-full bg-brand-600 py-3 font-semibold text-white shadow-lg disabled:opacity-50"
      >
        {submitting ? "Redirecting to payment…" : `Pay ${formatKobo(total)}`}
      </button>
    </form>
  );
}
