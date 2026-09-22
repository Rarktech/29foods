"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/lib/cart-context";
import { formatKobo } from "@/lib/format";
import { getMenuImage, BESTSELLER_NAME } from "@/lib/menu-images";

export interface MenuItemWithStock {
  id: string;
  name: string;
  category: string;
  price: number;
  imageUrl: string | null;
  stockCount: number;
  isAvailable: boolean;
}

const CATEGORIES = [
  { value: "all", label: "All" },
  { value: "rice", label: "Rice" },
  { value: "protein", label: "Protein" },
  { value: "drink", label: "Drinks" },
  { value: "snack", label: "Snacks" },
  { value: "swallow", label: "Swallow" },
];

export function MenuGrid({ items }: { items: MenuItemWithStock[] }) {
  const [category, setCategory] = useState("all");
  const visible = category === "all" ? items : items.filter((i) => i.category === category);
  const bestsellerId = items.find((i) => i.name === BESTSELLER_NAME)?.id ?? items[0]?.id;

  return (
    <>
      <div className="scrollbar-none flex gap-2.5 overflow-x-auto px-5 pb-[18px]">
        {CATEGORIES.map((c) => {
          const active = c.value === category;
          return (
            <button
              key={c.value}
              onClick={() => setCategory(c.value)}
              className="shrink-0 rounded-full px-[18px] py-2.5 text-[13px]"
              style={{
                background: active ? "rgb(var(--color-heading))" : "rgb(var(--color-card))",
                color: active ? "rgb(var(--color-bg))" : "rgb(var(--color-body))",
                border: active ? "none" : "1px solid rgb(var(--color-border))",
                fontWeight: active ? 700 : 600,
              }}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3.5 px-5">
        {visible.map((item) => (
          <MenuCard key={item.id} item={item} isBestseller={item.id === bestsellerId} />
        ))}
      </div>
    </>
  );
}

function MenuCard({ item, isBestseller }: { item: MenuItemWithStock; isBestseller: boolean }) {
  const { addItem, removeItemAnyBasket, lines } = useCart();
  const soldOut = !item.isAvailable || item.stockCount <= 0;
  const inCart = lines.find((l) => l.menuItemId === item.id);
  const selected = !soldOut && !!inCart;
  const staticImage = getMenuImage(item.name);

  const cardStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    background: selected ? "rgb(var(--color-accent-tint))" : "rgb(var(--color-card))",
    backdropFilter: "blur(14px) saturate(1.4)",
    WebkitBackdropFilter: "blur(14px) saturate(1.4)",
    border: selected ? "1.5px solid rgb(var(--color-accent))" : "1px solid rgb(var(--color-border))",
    borderRadius: 18,
    overflow: "hidden",
    opacity: soldOut ? 0.55 : 1,
  };

  const cardBody = (
    <>
      <div style={{ height: 100, position: "relative" }}>
        {staticImage ? (
          <Image
            src={staticImage}
            alt={item.name}
            fill
            sizes="(min-width: 430px) 200px, 45vw"
            style={{ objectFit: "cover", filter: soldOut ? "grayscale(1)" : "none" }}
          />
        ) : item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={item.name}
            fill
            sizes="(min-width: 430px) 200px, 45vw"
            style={{ objectFit: "cover", filter: soldOut ? "grayscale(1)" : "none" }}
          />
        ) : (
          <div className="h-full w-full bg-border" />
        )}
        {isBestseller && !soldOut && (
          <span
            style={{
              position: "absolute",
              top: 8,
              left: 8,
              background: "rgb(var(--color-accent))",
              color: "#FFFFFF",
              fontSize: 9,
              fontWeight: 800,
              letterSpacing: "0.04em",
              padding: "3px 8px",
              borderRadius: 999,
            }}
          >
            BESTSELLER
          </span>
        )}
        {selected && (
          <div
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              width: 22,
              height: 22,
              borderRadius: 999,
              background: "rgb(var(--color-accent))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
        )}
      </div>
      <div style={{ padding: "10px 12px 12px 12px" }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: "rgb(var(--color-heading))", marginBottom: 2 }}>{item.name}</div>
        <div
          style={{
            fontSize: 11.5,
            marginBottom: 8,
            fontWeight: soldOut ? 700 : 400,
            color: soldOut ? "rgb(var(--color-accent))" : "rgb(var(--color-muted))",
          }}
        >
          {soldOut ? "Sold out" : CATEGORY_SUB[item.category] ?? ""}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: "rgb(var(--color-heading))" }}>{formatKobo(item.price)}</span>
          {!soldOut && (
            <button
              type="button"
              aria-label={selected ? `Remove ${item.name} from cart` : `Add ${item.name} to cart`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (selected) {
                  removeItemAnyBasket(item.id);
                } else {
                  addItem({ menuItemId: item.id, name: item.name, unitPrice: item.price, imageUrl: item.imageUrl });
                }
              }}
              className="menu-card-plus"
              style={{
                width: 26,
                height: 26,
                borderRadius: 999,
                background: selected ? "#8A1512" : "rgb(var(--color-accent))",
                color: "#FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 16,
                fontWeight: 700,
                border: "none",
                transform: selected ? "rotate(45deg)" : "none",
                transition: "transform 0.16s ease, background 0.16s ease",
              }}
            >
              +
            </button>
          )}
        </div>
      </div>
    </>
  );

  if (soldOut) {
    return (
      <div style={{ position: "relative" }}>
        <div className="menu-card" style={cardStyle} aria-disabled>
          {cardBody}
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      <Link href={`/item/${item.id}`} className="menu-card" style={cardStyle}>
        {cardBody}
      </Link>
    </div>
  );
}

const CATEGORY_SUB: Record<string, string> = {
  rice: "Freshly made rice",
  protein: "Char-grilled",
  drink: "Chilled",
  snack: "Snack",
};
