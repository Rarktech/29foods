"use client";

import Image from "next/image";
import { useCart } from "@/lib/cart-context";
import { formatKobo } from "@/lib/format";

export interface MenuItemWithStock {
  id: string;
  name: string;
  category: string;
  price: number;
  imageUrl: string | null;
  stockCount: number;
  isAvailable: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  rice: "🍚 Rice",
  protein: "🍗 Protein",
  drink: "🥤 Drinks",
  snack: "🥟 Snacks",
};

export function MenuGrid({ items }: { items: MenuItemWithStock[] }) {
  const byCategory = groupBy(items, (i) => i.category);

  return (
    <div className="flex flex-col gap-8">
      {Object.entries(byCategory).map(([category, categoryItems]) => (
        <section key={category}>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
            {CATEGORY_LABELS[category] ?? category}
          </h2>
          <div className="flex flex-col divide-y divide-neutral-100 rounded-2xl border border-neutral-100 bg-white">
            {categoryItems.map((item) => (
              <MenuItemRow key={item.id} item={item} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function MenuItemRow({ item }: { item: MenuItemWithStock }) {
  const { addItem, lines, updateQty } = useCart();
  const soldOut = !item.isAvailable || item.stockCount <= 0;
  const inCart = lines.find((l) => l.menuItemId === item.id);

  return (
    <div className={`flex items-center gap-3 p-4 ${soldOut ? "opacity-40" : ""}`}>
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-neutral-100">
        {item.imageUrl && <Image src={item.imageUrl} alt={item.name} fill className="object-cover" sizes="56px" />}
      </div>
      <div className="flex-1">
        <p className="font-medium">{item.name}</p>
        <p className="text-sm text-neutral-500">{formatKobo(item.price)}</p>
        {soldOut && <p className="text-xs font-medium text-red-500">Sold out</p>}
      </div>
      {!soldOut &&
        (inCart ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => updateQty(item.id, inCart.qty - 1)}
              className="h-8 w-8 rounded-full border border-neutral-200 text-lg leading-none"
              aria-label={`Remove one ${item.name}`}
            >
              −
            </button>
            <span className="w-4 text-center font-medium">{inCart.qty}</span>
            <button
              onClick={() => updateQty(item.id, inCart.qty + 1)}
              className="h-8 w-8 rounded-full border border-neutral-200 text-lg leading-none"
              aria-label={`Add one more ${item.name}`}
            >
              +
            </button>
          </div>
        ) : (
          <button
            onClick={() =>
              addItem({ menuItemId: item.id, name: item.name, unitPrice: item.price, imageUrl: item.imageUrl })
            }
            className="rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600"
          >
            Add
          </button>
        ))}
    </div>
  );
}

function groupBy<T, K extends string>(items: T[], keyFn: (item: T) => K): Record<K, T[]> {
  return items.reduce(
    (acc, item) => {
      const key = keyFn(item);
      (acc[key] ??= []).push(item);
      return acc;
    },
    {} as Record<K, T[]>,
  );
}
