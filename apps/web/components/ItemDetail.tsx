"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useCart } from "@/lib/cart-context";
import { formatKobo } from "@/lib/format";
import { getMenuImage } from "@/lib/menu-images";
import { PROTEIN_ADDONS } from "@/lib/protein-addons";
import type { MenuItemWithStock } from "@/components/MenuGrid";

interface UpsellItem {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
}

export function ItemDetail({ item, upsell }: { item: MenuItemWithStock; upsell: UpsellItem | null }) {
  const router = useRouter();
  const { baskets, addItem, addBasket, renameBasket } = useCart();

  const [proteinId, setProteinId] = useState<string | null>(item.category === "rice" ? (PROTEIN_ADDONS[0]?.id ?? null) : null);
  const [qty, setQty] = useState(1);
  const [addUpsell, setAddUpsell] = useState(false);
  const [basketId, setBasketId] = useState<string | null>(baskets[0]?.id ?? null);

  const protein = proteinId ? PROTEIN_ADDONS.find((p) => p.id === proteinId) ?? null : null;
  const unitPrice = item.price + (protein?.priceKobo ?? 0);
  const soldOut = !item.isAvailable || item.stockCount <= 0;
  const staticImage = getMenuImage(item.name);
  const activeBasket = baskets.find((b) => b.id === basketId);
  const ctaLabel = activeBasket ? `Add to ${activeBasket.label}` : "Add to Basket";

  function handleAdd() {
    if (soldOut) return;
    const targetBasketId = basketId ?? undefined;
    addItem(
      {
        menuItemId: item.id,
        name: item.name,
        addonId: protein?.id,
        addonLabel: protein?.label,
        unitPrice,
        imageUrl: item.imageUrl,
        basketId: targetBasketId,
      },
      qty,
    );
    if (addUpsell && upsell) {
      addItem({ menuItemId: upsell.id, name: upsell.name, unitPrice: upsell.price, imageUrl: upsell.imageUrl, basketId: targetBasketId }, 1);
    }
    router.push("/cart");
  }

  return (
    <div className="scrollbar-none flex flex-grow flex-col overflow-y-auto pb-[130px]">
      {/* Hero */}
      <div className="relative h-[280px] w-full">
        {staticImage ? (
          <Image src={staticImage} alt={item.name} fill className="object-cover" priority />
        ) : item.imageUrl ? (
          <Image src={item.imageUrl} alt={item.name} fill className="object-cover" priority />
        ) : (
          <div className="h-full w-full bg-border" />
        )}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[110px]"
          style={{ background: "linear-gradient(to bottom, rgba(255,248,240,0) 0%, rgb(var(--color-bg)) 92%)" }}
        />
        <button
          aria-label="Back"
          onClick={() => router.back()}
          className="absolute left-[18px] top-[18px] flex h-[38px] w-[38px] items-center justify-center rounded-full bg-white/90"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1A1613" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      <div className="relative -mt-7 px-5 pt-1.5">
        <div className="mb-2 flex items-start justify-between gap-3">
          <h1 className="text-2xl font-extrabold leading-[1.15] text-heading">{item.name}</h1>
        </div>
        <p className="mb-3.5 text-[13.5px] leading-[1.55] text-body">{CATEGORY_BLURB[item.category] ?? ""}</p>
        <div className="mb-5 flex items-center gap-4">
          <InfoTag icon={<ClockIcon />} label="25–30 min" />
          <InfoTag icon={<PepperIcon />} label={item.category === "protein" ? "Char-grilled" : "Medium spice"} />
          <InfoTag icon={<PlateIcon />} label="1 serving" />
        </div>

        {soldOut && (
          <p className="mb-5 rounded-2xl bg-accent-tint px-4 py-3 text-sm font-bold text-accent">This dish is sold out right now.</p>
        )}

        <div className="mb-5 h-px bg-border" />

        {item.category === "rice" && (
          <>
            <h3 className="mb-3 text-[15px] font-bold text-heading">Choose your protein</h3>
            <div className="mb-[22px] flex flex-col gap-2.5">
              {PROTEIN_ADDONS.map((option) => {
                const active = proteinId === option.id;
                return (
                  <button
                    key={option.id}
                    onClick={() => setProteinId(active ? null : option.id)}
                    className="flex items-center justify-between rounded-[14px] px-4 py-3.5"
                    style={{
                      border: active ? "1.5px solid rgb(var(--color-accent))" : "1.5px solid rgb(var(--color-border))",
                      background: active ? "rgb(var(--color-accent-tint))" : "rgb(var(--color-card))",
                    }}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className="h-[18px] w-[18px] shrink-0 rounded-full"
                        style={{ border: active ? "5px solid rgb(var(--color-accent))" : "2px solid #D8CBB9" }}
                      />
                      <span className={`text-[13.5px] ${active ? "font-bold text-heading" : "font-semibold text-body"}`}>{option.label}</span>
                    </div>
                    <span className={`text-[13px] font-bold ${active ? "text-heading" : "text-body"}`}>+{formatKobo(option.priceKobo)}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {upsell && (
          <button
            onClick={() => setAddUpsell((v) => !v)}
            className="relative mb-[22px] flex items-center gap-3 overflow-hidden rounded-2xl px-4 py-3.5"
            style={{ background: addUpsell ? "rgb(var(--color-success))" : "#1A1613" }}
          >
            <div className="z-[1] flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl bg-white p-1.5">
              {getMenuImage(upsell.name) ? (
                <Image src={getMenuImage(upsell.name)!} alt={upsell.name} width={34} height={34} className="h-[34px] w-[34px] object-contain" />
              ) : null}
            </div>
            <div className="z-[1] flex-grow text-left">
              <div className="text-[13px] font-bold text-white">{addUpsell ? "Added" : "Add a cold"} {upsell.name}?</div>
              <div className="text-[11.5px] text-[#F0E4D6]">Perfect with the pepper</div>
            </div>
            <span className="z-[1] shrink-0 rounded-full bg-[#FFB25C] px-[15px] py-2 text-xs font-extrabold text-[#1A1613]">
              {addUpsell ? "Added ✓" : `+ ${formatKobo(upsell.price)}`}
            </span>
          </button>
        )}

        {/* Quantity */}
        <div className="mb-[22px] flex items-center justify-between">
          <h3 className="text-[15px] font-bold text-heading">Quantity</h3>
          <div className="flex items-center gap-4 rounded-full border border-border bg-card px-2 py-1.5">
            <button
              aria-label="Decrease quantity"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="flex h-[30px] w-[30px] items-center justify-center rounded-full border-none bg-[#F3E8DA] text-[17px] font-bold text-heading dark:bg-[#262626]"
            >
              –
            </button>
            <span className="min-w-[12px] text-center text-sm font-extrabold text-heading">{qty}</span>
            <button
              aria-label="Increase quantity"
              onClick={() => setQty((q) => q + 1)}
              className="flex h-[30px] w-[30px] items-center justify-center rounded-full border-none bg-accent text-[17px] font-bold text-white"
            >
              +
            </button>
          </div>
        </div>

        <div className="mb-5 h-px bg-border" />

        <h3 className="mb-1.5 flex items-center gap-2 text-[15px] font-bold text-heading">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--color-accent))" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 8l-9-5-9 5 9 5 9-5z" />
            <path d="M3 8v8l9 5 9-5V8" />
            <path d="M12 13v8" />
          </svg>
          Who&rsquo;s this for?
        </h3>
        <p className="mb-3 text-xs leading-[1.5] text-muted">
          We&rsquo;ll write the name on the pack so nothing gets mixed up — great for splitting an order with roommates.
        </p>

        <div className="mb-3.5 flex flex-col gap-2.5">
          {baskets.map((basket, i) => {
            const active = basket.id === basketId;
            return (
              <div
                key={basket.id}
                onClick={() => setBasketId(basket.id)}
                className="flex cursor-pointer items-center gap-2.5 rounded-[14px] px-3.5 py-3"
                style={{
                  border: active ? "1.5px solid rgb(var(--color-accent))" : "1.5px solid rgb(var(--color-border))",
                  background: active ? "rgb(var(--color-accent-tint))" : "rgb(var(--color-card))",
                }}
              >
                <span
                  className="h-[18px] w-[18px] shrink-0 rounded-full"
                  style={{ border: active ? "5px solid rgb(var(--color-accent))" : "2px solid #D8CBB9" }}
                />
                <div className="flex-grow">
                  <div className="mb-0.5 text-xs font-bold text-muted">Basket {i + 1}</div>
                  <input
                    value={basket.label}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => renameBasket(basket.id, e.target.value)}
                    className={`w-full border-none bg-transparent p-0 text-[13.5px] outline-none ${active ? "font-bold text-heading" : "font-semibold text-body"}`}
                  />
                </div>
              </div>
            );
          })}

          <button
            onClick={() => setBasketId(addBasket(`Basket ${baskets.length + 1}`))}
            className="flex items-center justify-center gap-2 rounded-[14px] border-[1.5px] border-dashed border-[#D8CBB9] bg-transparent px-3.5 py-3 dark:border-[#3A3A3A]"
          >
            <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[#F3E8DA] text-xs font-extrabold text-heading dark:bg-[#262626]">+</span>
            <span className="text-[13px] font-bold text-body">Add another basket — order for a friend</span>
          </button>
        </div>
      </div>

      <div
        className="absolute bottom-[18px] left-4 right-4 rounded-panel p-3"
        style={{
          background: "var(--nav-bg)",
          backdropFilter: "blur(18px) saturate(1.6)",
          WebkitBackdropFilter: "blur(18px) saturate(1.6)",
          border: "1px solid var(--nav-border)",
          boxShadow: "var(--nav-shadow)",
        }}
      >
        <button
          onClick={handleAdd}
          disabled={soldOut}
          className="flex w-full items-center justify-between rounded-2xl bg-accent px-5 py-4 disabled:opacity-50"
        >
          <span className="text-sm font-bold text-white">{soldOut ? "Sold out" : ctaLabel}</span>
          {!soldOut && <span className="text-[15px] font-extrabold text-white">{formatKobo(unitPrice * qty + (addUpsell && upsell ? upsell.price : 0))}</span>}
        </button>
      </div>
    </div>
  );
}

const CATEGORY_BLURB: Record<string, string> = {
  rice: "Freshly made, slow-cooked in a rich base and packed hot for your room.",
  protein: "Char-grilled and seasoned in-house — a 29Foods favourite.",
  drink: "Chilled and ready to go.",
  snack: "A quick, satisfying bite.",
};

function InfoTag({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      {icon}
      <span className="text-xs font-semibold text-muted">{label}</span>
    </div>
  );
}

function ClockIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--color-muted))" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  );
}
function PepperIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--color-muted))" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2c1 2.5-1.5 3.5-1.5 6A2.5 2.5 0 0 0 15 8c1.2 1.2 1.5 2.8 1.5 4a4.5 4.5 0 0 1-9 0c0-3 2.2-4 2.2-6.2 0-1.2.4-2.4 2.3-3.8z" />
    </svg>
  );
}
function PlateIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--color-muted))" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="12" rx="9" ry="9" />
      <circle cx="12" cy="12" r="3.2" />
    </svg>
  );
}
