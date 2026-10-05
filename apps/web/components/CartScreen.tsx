"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useCart, type CartLine } from "@/lib/cart-context";
import { formatKobo } from "@/lib/format";
import { calculateDeliveryFee, FREE_DELIVERY_THRESHOLD_KOBO } from "@/lib/pricing";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getMenuImage } from "@/lib/menu-images";
import { readStoredSourceQr } from "@/components/QrAttributionCapture";
import { WalletFundSheet, CheckDot, useTopupReturn } from "@/components/WalletFundSheet";
import { PersonNameSheet } from "@/components/OrderingForBar";
import { TourLauncher } from "@/components/SpotlightTour";

interface SavedLocation {
  id: string;
  label: string;
  lodge: string;
  room: string | null;
  note: string | null;
}

const LABEL_TEXT: Record<string, string> = { home: "HOME", work: "WORK", friend: "FRIEND", other: "OTHER" };

export function CartScreen({
  isLoggedIn,
  userId,
  userPhone,
  walletBalance,
  cartTipSeen,
  initialSavedLocations,
}: {
  isLoggedIn: boolean;
  userId: string | null;
  userPhone: string | null;
  walletBalance: number;
  /** Whether the one-time "pay from your wallet" tip has been seen (null for guests). */
  cartTipSeen: boolean | null;
  initialSavedLocations: SavedLocation[];
}) {
  const router = useRouter();
  const { baskets, lines, updateQty, addBasket, removeBasket, renameBasket, basketSubtotal, subtotal, clear, moveLine, setActiveBasket, activeBasketId } =
    useCart();
  const [personSheetOpen, setPersonSheetOpen] = useState(false);
  /** Basket awaiting a second tap to confirm removal (only asked when it has food in it). */
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  /** The line whose "Move to…" menu is open, keyed basketId|menuItemId|addonId. */
  const [moveMenuFor, setMoveMenuFor] = useState<string | null>(null);

  /** Browse the menu with this person selected, so everything added lands in their pack. */
  function addFoodFor(basketId: string) {
    setActiveBasket(basketId);
    router.push("/");
  }

  const [locations, setLocations] = useState(initialSavedLocations);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(initialSavedLocations[0]?.id ?? null);
  const [addingLocation, setAddingLocation] = useState(initialSavedLocations.length === 0);
  const [locationForm, setLocationForm] = useState({ label: "home", lodge: "", room: "", note: "" });
  const [phone, setPhone] = useState(userPhone ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deliveryFee = calculateDeliveryFee(subtotal);
  const total = subtotal + deliveryFee;
  const remainingForFree = deliveryFee > 0 ? FREE_DELIVERY_THRESHOLD_KOBO - subtotal : 0;
  const progressPct = Math.min(100, Math.round((subtotal / FREE_DELIVERY_THRESHOLD_KOBO) * 100));
  const selectedLocation = locations.find((l) => l.id === selectedLocationId) ?? null;

  const wallet = useTopupReturn(walletBalance);
  const [fundSheetOpen, setFundSheetOpen] = useState(false);
  // The website is wallet-only: card/transfer is only used to fund the wallet.
  const walletShortfall = Math.max(0, total - wallet.balance);
  const walletShort = walletShortfall > 0;

  const linesByBasket = useMemo(() => {
    const map = new Map<string, CartLine[]>();
    for (const line of lines) {
      const arr = map.get(line.basketId) ?? [];
      arr.push(line);
      map.set(line.basketId, arr);
    }
    return map;
  }, [lines]);

  async function saveLocation() {
    if (!locationForm.lodge.trim() || !userId) return;
    const supabase = getSupabaseBrowserClient();
    const { data, error: insertError } = await supabase
      .from("saved_locations")
      .insert({
        user_id: userId,
        label: locationForm.label as "home" | "work" | "friend" | "other",
        lodge: locationForm.lodge.trim(),
        room: locationForm.room.trim() || null,
        note: locationForm.note.trim() || null,
        is_default: locations.length === 0,
      })
      .select("id, label, lodge, room, note")
      .single();
    if (insertError || !data) {
      setError("Couldn't save that location. Please try again.");
      return;
    }
    setLocations((prev) => [...prev, data]);
    setSelectedLocationId(data.id);
    setAddingLocation(false);
    setLocationForm({ label: "home", lodge: "", room: "", note: "" });
  }

  async function handlePay() {
    if (!isLoggedIn) {
      router.push("/login?next=/cart");
      return;
    }
    if (!selectedLocation) {
      setError("Pick a delivery location first.");
      return;
    }
    if (walletShort) {
      setFundSheetOpen(true);
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const items = lines.map((l) => {
        const index = baskets.findIndex((b) => b.id === l.basketId);
        // A pack always carries a name for the kitchen to write — never a blank label.
        const basketLabel = baskets[index]?.label.trim() || `Person ${index + 1}`;
        return { menuItemId: l.menuItemId, qty: l.qty, basketLabel, addonId: l.addonId };
      });
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          lodge: selectedLocation.lodge,
          room: selectedLocation.room,
          phone: phone.trim() || null,
          sourceQr: readStoredSourceQr(),
        }),
      });
      const body = (await response.json()) as { error?: string; code?: string; orderId?: string; paid?: boolean };
      if (response.ok && body.paid && body.orderId) {
        // Settled from the wallet — straight to tracking, no checkout page.
        clear();
        router.push(`/order/${body.orderId}`);
        return;
      }
      if (body.code === "INSUFFICIENT_WALLET") {
        // Balance changed since the page loaded (e.g. spent in another tab) — offer the top-up.
        setFundSheetOpen(true);
      }
      throw new Error(body.error ?? "Something went wrong. Please try again.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  if (lines.length === 0) {
    return (
      <>
        <div className="flex items-center gap-3.5 px-5 pb-3.5 pt-[18px]">
          <button
            aria-label="Back"
            onClick={() => router.back()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-card"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--color-heading))" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-[18px] font-extrabold text-heading">Your order</h1>
        </div>
        <div className="flex flex-grow flex-col items-center justify-center gap-3 px-10 text-center">
          <p className="text-muted">Your cart is empty.</p>
          <Link href="/" className="font-bold text-accent">
            Browse the menu →
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="flex items-center gap-3.5 px-5 pb-3.5 pt-[18px]">
        <button
          aria-label="Back"
          onClick={() => router.back()}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-card"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--color-heading))" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-[18px] font-extrabold text-heading">Your order</h1>
      </div>

      <div className="scrollbar-none flex-grow overflow-y-auto pb-[240px]">
        <div className="px-5 pt-1.5">
          <p className="mb-4 text-xs leading-[1.5] text-muted">
            Split it by person — each basket gets its own name written on the pack, one delivery, one bill.
          </p>

          {baskets.map((basket, i) => {
            const basketLines = linesByBasket.get(basket.id) ?? [];
            // Highlight whoever's being ordered for (the first basket when ordering solo).
            const isFirst = basket.id === activeBasketId;
            const displayName = basket.label.trim() || `Person ${i + 1}`;
            const itemsInBasket = basketLines.reduce((n, l) => n + l.qty, 0);
            return (
              <div
                key={basket.id}
                className="mb-3.5 rounded-xl2 p-3.5"
                style={{
                  border: isFirst ? "1.5px solid rgb(var(--color-accent))" : "1.5px solid rgb(var(--color-border))",
                  background: isFirst ? "rgb(var(--color-accent-tint))" : "rgb(var(--color-card))",
                }}
              >
                <div className="mb-3 flex items-center gap-2.5">
                  <span
                    className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full text-xs font-extrabold text-white"
                    style={{ background: isFirst ? "rgb(var(--color-accent))" : "rgb(var(--color-heading))" }}
                  >
                    {i + 1}
                  </span>
                  <div className="flex-grow">
                    <label
                      className="mb-0.5 block text-[10.5px] font-bold uppercase tracking-[0.04em]"
                      style={{ color: isFirst ? "rgb(var(--color-accent))" : "rgb(var(--color-muted))" }}
                    >
                      Name on this pack
                    </label>
                    <input
                      value={basket.label}
                      placeholder={`Person ${i + 1}`}
                      onChange={(e) => renameBasket(basket.id, e.target.value)}
                      className="w-full border-none bg-transparent p-0 text-[14.5px] font-bold text-heading outline-none"
                    />
                  </div>
                  {baskets.length > 1 &&
                    (confirmRemoveId === basket.id ? (
                      <div className="flex shrink-0 items-center gap-1.5">
                        <button
                          onClick={() => {
                            removeBasket(basket.id);
                            setConfirmRemoveId(null);
                          }}
                          className="rounded-full bg-accent px-2.5 py-1 text-[11px] font-bold text-white"
                        >
                          Remove {itemsInBasket} item{itemsInBasket === 1 ? "" : "s"}
                        </button>
                        <button onClick={() => setConfirmRemoveId(null)} className="px-1 text-[11px] font-bold text-muted">
                          Keep
                        </button>
                      </div>
                    ) : (
                      <button
                        aria-label={`Remove ${displayName}'s pack`}
                        // An empty pack goes straight away; one with food asks first.
                        onClick={() => (itemsInBasket > 0 ? setConfirmRemoveId(basket.id) : removeBasket(basket.id))}
                        className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full border-none bg-bg"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--color-muted))" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 6 6 18M6 6l12 12" />
                        </svg>
                      </button>
                    ))}
                </div>

                {basketLines.length === 0 && (
                  <div className="mb-2 rounded-[14px] bg-card px-3.5 py-4 text-center">
                    <p className="mb-2.5 text-[12.5px] text-muted">Nothing in {displayName}&rsquo;s pack yet.</p>
                    <button onClick={() => addFoodFor(basket.id)} className="rounded-full bg-accent px-4 py-2 text-[12.5px] font-bold text-white">
                      Browse the menu for {displayName}
                    </button>
                  </div>
                )}

                {basketLines.map((line) => {
                  const img = getMenuImage(line.name);
                  const displayName = line.addonLabel ? `${line.name} — ${line.addonLabel}` : line.name;
                  const lineKey = `${basket.id}|${line.menuItemId}|${line.addonId ?? ""}`;
                  return (
                    <div key={`${line.menuItemId}-${line.addonId ?? "plain"}`} className="mb-2 flex gap-2.5 rounded-[14px] bg-card p-2.5">
                      {img ? (
                        <Image src={img} alt={displayName} width={52} height={52} className="h-[52px] w-[52px] shrink-0 rounded-[10px] object-cover" />
                      ) : (
                        <div className="h-[52px] w-[52px] shrink-0 rounded-[10px] bg-border" />
                      )}
                      <div className="flex-grow">
                        <div className="mb-0.5 flex items-start justify-between gap-2">
                          <div className="text-[13px] font-bold text-heading">{displayName}</div>
                          {baskets.length > 1 && (
                            <button
                              onClick={() => setMoveMenuFor(moveMenuFor === lineKey ? null : lineKey)}
                              className="shrink-0 text-[11px] font-bold text-accent"
                              aria-expanded={moveMenuFor === lineKey}
                            >
                              Move ↗
                            </button>
                          )}
                        </div>
                        {moveMenuFor === lineKey && (
                          <div className="mb-2 flex flex-wrap gap-1.5">
                            {baskets
                              .filter((b) => b.id !== basket.id)
                              .map((target) => {
                                const targetIndex = baskets.indexOf(target);
                                return (
                                  <button
                                    key={target.id}
                                    onClick={() => {
                                      moveLine(basket.id, line.menuItemId, line.addonId, target.id);
                                      setMoveMenuFor(null);
                                    }}
                                    className="rounded-full border border-border bg-bg px-2.5 py-1 text-[11px] font-bold text-heading"
                                  >
                                    to {target.label.trim() || `Person ${targetIndex + 1}`}
                                  </button>
                                );
                              })}
                          </div>
                        )}
                        <div className="mb-1.5 text-[11px] text-muted">
                          {line.qty} × {formatKobo(line.unitPrice)}
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 rounded-full bg-bg px-[5px] py-[3px]">
                            <button
                              aria-label="Decrease"
                              onClick={() => updateQty(basket.id, line.menuItemId, line.qty - 1, line.addonId)}
                              className="flex h-5 w-5 items-center justify-center rounded-full border-none bg-[#F3E8DA] text-[13px] font-bold text-heading dark:bg-[#262626]"
                            >
                              –
                            </button>
                            <span className="text-xs font-extrabold text-heading">{line.qty}</span>
                            <button
                              aria-label="Increase"
                              onClick={() => updateQty(basket.id, line.menuItemId, line.qty + 1, line.addonId)}
                              className="flex h-5 w-5 items-center justify-center rounded-full border-none bg-accent text-[13px] font-bold text-white"
                            >
                              +
                            </button>
                          </div>
                          <span className="text-[13px] font-extrabold text-heading">{formatKobo(line.unitPrice * line.qty)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {basketLines.length > 0 && (
                  <>
                    <button onClick={() => addFoodFor(basket.id)} className="mb-2 text-[12px] font-bold text-accent">
                      + Add food for {displayName}
                    </button>
                    <div
                      className="flex justify-between pt-0.5 text-[12.5px] font-bold"
                      style={{ color: isFirst ? "var(--promise-fg)" : "rgb(var(--color-body))" }}
                    >
                      <span>Basket subtotal</span>
                      <span>{formatKobo(basketSubtotal(basket.id))}</span>
                    </div>
                  </>
                )}
              </div>
            );
          })}

          <button
            onClick={() => setPersonSheetOpen(true)}
            className="mb-5 flex w-full items-center justify-center gap-2 rounded-2xl border-[1.5px] border-dashed border-[#D8CBB9] bg-transparent p-3.5 dark:border-[#4A453D]"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#F3E8DA] text-[13px] font-extrabold text-heading dark:bg-[#262626]">+</span>
            <span className="text-[13.5px] font-bold text-body">Add another basket for a friend</span>
          </button>

          {/* Free delivery progress */}
          <div className="mb-5 rounded-[14px] p-3.5" style={{ background: "var(--promise-bg)" }}>
            <div className="mb-2 flex items-center gap-2 text-[11.5px] font-bold" style={{ color: "var(--promise-fg)" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--promise-fg)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                <circle cx="6" cy="18" r="3" />
                <circle cx="17" cy="18" r="3" />
                <path d="M3 18h1l1.5-7h6L15 18" />
                <path d="M9.5 11 12 6h4l2 5" />
                <path d="M6 6h3" />
              </svg>
              <span>
                {deliveryFee === 0
                  ? "Free delivery unlocked!"
                  : `Free delivery unlocked on orders over ${formatKobo(FREE_DELIVERY_THRESHOLD_KOBO)} combined`}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[#F3D9AE] dark:bg-[#3A2C15]">
              <div className="h-full rounded-full bg-success" style={{ width: `${progressPct}%` }} />
            </div>
            {remainingForFree > 0 && (
              <p className="mt-1.5 text-[11px] font-semibold" style={{ color: "var(--promise-fg)" }}>
                Add {formatKobo(remainingForFree)} more to unlock free delivery
              </p>
            )}
          </div>

          {/* Delivery location picker */}
          <div className="mb-2.5 flex items-center justify-between">
            <h3 className="text-[14.5px] font-bold text-heading">Delivering to</h3>
            {baskets.length > 1 && <span className="text-[11px] font-semibold text-muted">All baskets, one drop-off</span>}
          </div>

          <div className="mb-5 flex flex-col gap-2.5">
            {locations.map((loc) => {
              const active = loc.id === selectedLocationId;
              return (
                <label
                  key={loc.id}
                  className="flex cursor-pointer items-center gap-3 rounded-[14px] px-4 py-3.5"
                  style={{
                    background: active ? "rgb(var(--color-accent-tint))" : "rgb(var(--color-card))",
                    border: active ? "1.5px solid rgb(var(--color-accent))" : "1.5px solid rgb(var(--color-border))",
                  }}
                >
                  <input
                    type="radio"
                    name="delivery-location"
                    checked={active}
                    onChange={() => setSelectedLocationId(loc.id)}
                    className="h-[18px] w-[18px] shrink-0 accent-accent"
                  />
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? "rgb(var(--color-accent))" : "rgb(var(--color-muted))"} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <div className="flex-grow">
                    <div className="mb-px flex items-center gap-1.5">
                      <span className={`text-[13px] ${active ? "font-bold text-heading" : "font-semibold text-body"}`}>
                        {loc.lodge}
                        {loc.room ? `, ${loc.room}` : ""}
                      </span>
                      <span
                        className="rounded-full px-[7px] py-0.5 text-[9px] font-extrabold"
                        style={{
                          background: active ? "rgb(var(--color-accent))" : "#F3E8DA",
                          color: active ? "#FFFFFF" : "#6B5C4E",
                        }}
                      >
                        {LABEL_TEXT[loc.label] ?? "OTHER"}
                      </span>
                    </div>
                    {loc.note && <span className="text-[11.5px] text-muted">{loc.note}</span>}
                  </div>
                </label>
              );
            })}

            {addingLocation ? (
              <div className="flex flex-col gap-2.5 rounded-[14px] border-[1.5px] border-border bg-card p-3.5">
                <div className="flex gap-1.5">
                  {(["home", "work", "friend", "other"] as const).map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setLocationForm((f) => ({ ...f, label: l }))}
                      className="rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase"
                      style={{
                        background: locationForm.label === l ? "rgb(var(--color-accent))" : "rgb(var(--color-bg))",
                        color: locationForm.label === l ? "#FFFFFF" : "rgb(var(--color-body))",
                      }}
                    >
                      {l}
                    </button>
                  ))}
                </div>
                <input
                  placeholder="Lodge (e.g. Peace Lodge)"
                  value={locationForm.lodge}
                  onChange={(e) => setLocationForm((f) => ({ ...f, lodge: e.target.value }))}
                  className="rounded-lg border border-border bg-bg px-3 py-2 text-sm text-heading"
                />
                <input
                  placeholder="Room (optional)"
                  value={locationForm.room}
                  onChange={(e) => setLocationForm((f) => ({ ...f, room: e.target.value }))}
                  className="rounded-lg border border-border bg-bg px-3 py-2 text-sm text-heading"
                />
                <input
                  placeholder="Note, e.g. behind the main gate (optional)"
                  value={locationForm.note}
                  onChange={(e) => setLocationForm((f) => ({ ...f, note: e.target.value }))}
                  className="rounded-lg border border-border bg-bg px-3 py-2 text-sm text-heading"
                />
                <div className="flex gap-2">
                  <button onClick={saveLocation} className="flex-grow rounded-full bg-accent py-2 text-[13px] font-bold text-white">
                    Save location
                  </button>
                  {locations.length > 0 && (
                    <button onClick={() => setAddingLocation(false)} className="rounded-full border border-border px-4 py-2 text-[13px] font-semibold text-body">
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <button
                onClick={() => setAddingLocation(true)}
                className="flex items-center justify-center gap-2 rounded-[14px] border-[1.5px] border-dashed border-[#D8CBB9] bg-transparent px-4 py-3.5 dark:border-[#4A453D]"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#F3E8DA] text-[13px] font-extrabold text-heading dark:bg-[#262626]">+</span>
                <span className="text-[13px] font-bold text-body">Add a new location</span>
              </button>
            )}
          </div>

          {!userPhone && (
            <div className="mb-5">
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.04em] text-muted">Phone (optional, for the rider)</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 08012345678"
                type="tel"
                className="w-full rounded-[14px] border border-border bg-card px-4 py-3 text-sm text-heading"
              />
            </div>
          )}

          {/* Payment */}
          <h3 className="mb-2.5 text-[14.5px] font-bold text-heading">Pay with</h3>
          <div data-tour="pay-with" className="mb-2 flex flex-col gap-2.5">
            <WalletPayRow
              subtitle={
                !isLoggedIn
                  ? "Sign in to pay from your wallet"
                  : wallet.state === "confirming"
                    ? "Confirming your top-up…"
                    : `${formatKobo(wallet.balance)} available${walletShortfall === 0 ? " · pays instantly" : ""}`
              }
            />
            {isLoggedIn && walletShort && (
              <div className="rounded-[14px] p-3.5" style={{ background: "var(--promise-bg)" }}>
                <p className="mb-2.5 text-[12px] font-semibold leading-[1.5]" style={{ color: "var(--promise-fg)" }}>
                  {wallet.balance === 0
                    ? `Your wallet is empty. Top up at least ${formatKobo(walletShortfall)} to pay for this order.`
                    : `Your wallet is ${formatKobo(walletShortfall)} short for this ${formatKobo(total)} order. Top up to pay.`}
                </p>
                <button onClick={() => setFundSheetOpen(true)} className="rounded-full bg-accent px-4 py-2 text-[12.5px] font-bold text-white">
                  Top up wallet
                </button>
              </div>
            )}
          </div>
          <p className="text-[11px] text-muted">
            Orders are paid from your wallet. Fund it anytime by card, bank transfer or USSD. No cash on delivery, and no refunds once an order is placed.
          </p>
        </div>
      </div>

      {/* Sticky summary + CTA */}
      <div
        className="absolute bottom-[18px] left-4 right-4 rounded-panel p-4"
        style={{
          background: "var(--nav-bg)",
          backdropFilter: "blur(18px) saturate(1.6)",
          WebkitBackdropFilter: "blur(18px) saturate(1.6)",
          border: "1px solid var(--nav-border)",
          boxShadow: "var(--nav-shadow)",
        }}
      >
        <div className="mb-3.5 flex flex-col gap-1.5">
          {baskets.map((basket) => {
            const basketLines = linesByBasket.get(basket.id) ?? [];
            if (basketLines.length === 0) return null;
            return (
              <div key={basket.id} className="flex justify-between text-[12.5px] text-muted">
                <span>{basket.label || "Basket"}</span>
                <span>{formatKobo(basketSubtotal(basket.id))}</span>
              </div>
            );
          })}
          <div className="flex justify-between text-[12.5px] text-muted">
            <span>Delivery fee</span>
            <span className={deliveryFee === 0 ? "font-bold text-success" : ""}>{deliveryFee === 0 ? "Free" : formatKobo(deliveryFee)}</span>
          </div>
          <div className="my-1 h-px bg-border" />
          <div className="flex justify-between text-[15px] font-extrabold text-heading">
            <span>Total{baskets.length > 1 ? ` · ${baskets.length} baskets` : ""}</span>
            <span>{formatKobo(total)}</span>
          </div>
        </div>

        {error && <p className="mb-2 text-[12px] font-semibold text-accent">{error}</p>}

        <button
          onClick={handlePay}
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-accent px-5 py-4 disabled:opacity-60"
        >
          <span className="text-[14.5px] font-bold text-white">
            {!isLoggedIn
              ? "Sign in to pay"
              : submitting
                ? "Paying from wallet…"
                : walletShort
                  ? `Top up ${formatKobo(walletShortfall)} to pay`
                  : `Pay ${formatKobo(total)} from wallet`}
          </span>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </button>
      </div>

      <PersonNameSheet open={personSheetOpen} onClose={() => setPersonSheetOpen(false)} onSave={(name) => addBasket(name)} />

      {/* One-time tip; the wallet option only exists for signed-in users. */}
      <TourLauncher
        tourKey="cartTip"
        accountSeen={cartTipSeen}
        enabled={isLoggedIn}
        steps={[
          {
            target: "pay-with",
            title: "Pay in one tap",
            body: "Pay straight from your wallet, with no checkout page. If it's short, you can top up right here.",
          },
        ]}
      />

      <WalletFundSheet
        open={fundSheetOpen}
        onClose={() => setFundSheetOpen(false)}
        returnTo="/cart"
        suggestedAmountKobo={walletShortfall > 0 ? walletShortfall : undefined}
      />
    </>
  );
}

/** The single payment method on the website: the wallet (always selected). */
function WalletPayRow({ subtitle }: { subtitle: string }) {
  return (
    <div
      className="flex w-full items-center gap-3 rounded-[14px] px-4 py-3.5"
      style={{ background: "rgb(var(--color-accent-tint))", border: "1.5px solid rgb(var(--color-accent))" }}
    >
      <div className="flex h-6 w-[34px] shrink-0 items-center justify-center rounded-[5px] bg-heading text-[9px] font-extrabold text-[#FFB25C]">👛</div>
      <div className="flex-grow">
        <span className="block text-[13.5px] font-bold text-heading">Wallet</span>
        <span className="block text-[11px] text-muted">{subtitle}</span>
      </div>
      <CheckDot />
    </div>
  );
}
