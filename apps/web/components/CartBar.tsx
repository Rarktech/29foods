"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart-context";
import { formatKobo } from "@/lib/format";

/** Sticky bottom bar — appears once the cart has items, keeps checkout one tap away. */
export function CartBar() {
  const { itemCount, subtotal } = useCart();
  if (itemCount === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-10 border-t border-neutral-100 bg-white/95 p-4 backdrop-blur">
      <Link
        href="/cart"
        className="mx-auto flex max-w-2xl items-center justify-between rounded-full bg-brand-600 px-5 py-3 font-semibold text-white shadow-lg"
      >
        <span>
          {itemCount} item{itemCount > 1 ? "s" : ""}
        </span>
        <span>View cart · {formatKobo(subtotal)}</span>
      </Link>
    </div>
  );
}
