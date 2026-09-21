"use client";

import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart-context";

interface ReorderItem {
  menuItemId: string;
  name: string;
  unitPrice: number;
}

/** Adds a "your usual" bundle straight to the cart and jumps to it. */
export function ReorderButton({ items }: { items: ReorderItem[] }) {
  const { addItem } = useCart();
  const router = useRouter();

  return (
    <button
      className="rounded-full bg-heading px-4 py-2.5 text-[12.5px] font-bold text-bg"
      onClick={() => {
        for (const item of items) {
          addItem({ menuItemId: item.menuItemId, name: item.name, unitPrice: item.unitPrice, imageUrl: null });
        }
        router.push("/cart");
      }}
    >
      Reorder
    </button>
  );
}
