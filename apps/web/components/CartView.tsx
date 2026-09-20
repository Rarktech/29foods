"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart-context";
import { formatKobo } from "@/lib/format";

interface UpsellItem {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
}

export function CartView({ upsell }: { upsell: UpsellItem | null }) {
  const { lines, updateQty, subtotal, addItem } = useCart();
  const upsellInCart = upsell ? lines.some((l) => l.menuItemId === upsell.id) : true;

  if (lines.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-200 p-10 text-center text-neutral-500">
        <p>Your cart is empty.</p>
        <Link href="/" className="mt-3 inline-block font-semibold text-brand-600">
          Browse the menu →
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col divide-y divide-neutral-100 rounded-2xl border border-neutral-100 bg-white">
        {lines.map((line) => (
          <div key={line.menuItemId} className="flex items-center gap-3 p-4">
            <div className="flex-1">
              <p className="font-medium">{line.name}</p>
              <p className="text-sm text-neutral-500">{formatKobo(line.unitPrice)}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateQty(line.menuItemId, line.qty - 1)}
                className="h-8 w-8 rounded-full border border-neutral-200 text-lg leading-none"
                aria-label={`Remove one ${line.name}`}
              >
                −
              </button>
              <span className="w-4 text-center font-medium">{line.qty}</span>
              <button
                onClick={() => updateQty(line.menuItemId, line.qty + 1)}
                className="h-8 w-8 rounded-full border border-neutral-200 text-lg leading-none"
                aria-label={`Add one more ${line.name}`}
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>

      {upsell && !upsellInCart && (
        <button
          onClick={() => addItem({ menuItemId: upsell.id, name: upsell.name, unitPrice: upsell.price, imageUrl: upsell.imageUrl })}
          className="flex items-center justify-between rounded-2xl border border-brand-200 bg-brand-50 p-4 text-left"
        >
          <span>
            🥤 Add a cold <strong>{upsell.name}</strong> for {formatKobo(upsell.price)}?
          </span>
          <span className="font-semibold text-brand-700">Add</span>
        </button>
      )}

      <div className="flex items-center justify-between text-lg font-semibold">
        <span>Subtotal</span>
        <span>{formatKobo(subtotal)}</span>
      </div>

      <Link
        href="/checkout"
        className="rounded-full bg-brand-600 py-3 text-center font-semibold text-white shadow-lg"
      >
        Checkout
      </Link>
    </div>
  );
}
