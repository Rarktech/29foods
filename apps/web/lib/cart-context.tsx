"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export interface CartBasket {
  id: string;
  label: string;
}

export interface CartLine {
  basketId: string;
  menuItemId: string;
  /** Base dish name — never includes the addon suffix, so image/DB lookups by name still work. */
  name: string;
  /** Optional protein add-on (see lib/protein-addons.ts); re-derived server-side, never trusted from here. */
  addonId?: string;
  addonLabel?: string;
  unitPrice: number; // kobo, base + addon — for display only, re-derived server-side at checkout
  qty: number;
  imageUrl: string | null;
}

interface CartState {
  baskets: CartBasket[];
  lines: CartLine[];
  /** Who's being ordered for right now — every add without an explicit basket goes here. */
  activeBasketId?: string | null;
}

interface CartContextValue {
  baskets: CartBasket[];
  lines: CartLine[];
  /** The person currently being ordered for (see OrderingForBar). Null only before the first add. */
  activeBasketId: string | null;
  setActiveBasket: (basketId: string) => void;
  /** Adds to the given basket, else the active one, else creates "Me". */
  addItem: (item: Omit<CartLine, "qty" | "basketId"> & { basketId?: string }, qty?: number) => void;
  updateQty: (basketId: string, menuItemId: string, qty: number, addonId?: string) => void;
  removeItem: (basketId: string, menuItemId: string, addonId?: string) => void;
  /** Home's quick ✕: drops every line of this dish from one person's pack only. */
  removeFromBasket: (basketId: string, menuItemId: string) => void;
  /** Moves a line to another person's pack, merging with a matching line already there. */
  moveLine: (fromBasketId: string, menuItemId: string, addonId: string | undefined, toBasketId: string) => void;
  qtyInBasket: (basketId: string | null, menuItemId: string) => number;
  /** Creates a person's basket and makes it the active one. Returns its id. */
  addBasket: (label?: string) => string;
  removeBasket: (basketId: string) => void;
  renameBasket: (basketId: string, label: string) => void;
  linesForBasket: (basketId: string) => CartLine[];
  basketSubtotal: (basketId: string) => number;
  clear: () => void;
  subtotal: number;
  itemCount: number;
}

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "29foods.cart.v2";

function makeBasketId(): string {
  return `basket_${Math.random().toString(36).slice(2, 10)}`;
}

const EMPTY_STATE: CartState = { baskets: [], lines: [], activeBasketId: null };

/** Carts saved before activeBasketId existed (or pointing at a removed basket) fall back to the first basket. */
function resolveActive(state: CartState): string | null {
  return state.baskets.some((b) => b.id === state.activeBasketId) ? state.activeBasketId! : (state.baskets[0]?.id ?? null);
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CartState>(EMPTY_STATE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setState(JSON.parse(raw) as CartState);
    } catch {
      // corrupt/blocked storage — start with an empty cart rather than crash
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // storage unavailable — cart just won't persist across reloads this session
    }
  }, [state, hydrated]);

  const value = useMemo<CartContextValue>(() => {
    const { baskets, lines } = state;
    const activeBasketId = resolveActive(state);
    const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.qty, 0);
    const itemCount = lines.reduce((sum, l) => sum + l.qty, 0);

    return {
      baskets,
      lines,
      subtotal,
      itemCount,
      activeBasketId,

      setActiveBasket: (basketId) => setState((prev) => ({ ...prev, activeBasketId: basketId })),

      addItem: (item, qty = 1) => {
        setState((prev) => {
          let baskets = prev.baskets;
          let basketId = item.basketId ?? resolveActive(prev) ?? undefined;
          if (!basketId) {
            basketId = makeBasketId();
            baskets = [...baskets, { id: basketId, label: "Me" }];
          }

          const matches = (l: CartLine) => l.basketId === basketId && l.menuItemId === item.menuItemId && l.addonId === item.addonId;
          const existing = prev.lines.find(matches);
          const lines = existing
            ? prev.lines.map((l) => (matches(l) ? { ...l, qty: l.qty + qty } : l))
            : [...prev.lines, { ...item, basketId, qty }];

          return { baskets, lines, activeBasketId: resolveActive(prev) ?? basketId };
        });
      },

      updateQty: (basketId, menuItemId, qty, addonId) => {
        const matches = (l: CartLine) =>
          l.basketId === basketId && l.menuItemId === menuItemId && (addonId === undefined || l.addonId === addonId);
        setState((prev) => ({
          ...prev,
          lines: qty <= 0 ? prev.lines.filter((l) => !matches(l)) : prev.lines.map((l) => (matches(l) ? { ...l, qty } : l)),
        }));
      },

      removeItem: (basketId, menuItemId, addonId) =>
        setState((prev) => ({
          ...prev,
          lines: prev.lines.filter(
            (l) => !(l.basketId === basketId && l.menuItemId === menuItemId && (addonId === undefined || l.addonId === addonId)),
          ),
        })),

      removeFromBasket: (basketId, menuItemId) =>
        setState((prev) => ({
          ...prev,
          lines: prev.lines.filter((l) => !(l.basketId === basketId && l.menuItemId === menuItemId)),
        })),

      moveLine: (fromBasketId, menuItemId, addonId, toBasketId) =>
        setState((prev) => {
          const isSource = (l: CartLine) => l.basketId === fromBasketId && l.menuItemId === menuItemId && l.addonId === addonId;
          const source = prev.lines.find(isSource);
          if (!source || fromBasketId === toBasketId) return prev;
          const isTarget = (l: CartLine) => l.basketId === toBasketId && l.menuItemId === menuItemId && l.addonId === addonId;
          const merged = prev.lines.some(isTarget);
          const rest = prev.lines.filter((l) => !isSource(l)).map((l) => (isTarget(l) ? { ...l, qty: l.qty + source.qty } : l));
          return { ...prev, lines: merged ? rest : [...rest, { ...source, basketId: toBasketId }] };
        }),

      qtyInBasket: (basketId, menuItemId) =>
        basketId ? lines.filter((l) => l.basketId === basketId && l.menuItemId === menuItemId).reduce((n, l) => n + l.qty, 0) : 0,

      addBasket: (label) => {
        const id = makeBasketId();
        setState((prev) => {
          // Adding a friend before anything's in the cart still needs the orderer's own pack first.
          const baskets = prev.baskets.length === 0 ? [{ id: makeBasketId(), label: "Me" }] : prev.baskets;
          return {
            ...prev,
            baskets: [...baskets, { id, label: label?.trim() || `Person ${baskets.length + 1}` }],
            activeBasketId: id,
          };
        });
        return id;
      },

      removeBasket: (basketId) =>
        setState((prev) => {
          const baskets = prev.baskets.filter((b) => b.id !== basketId);
          return {
            baskets,
            lines: prev.lines.filter((l) => l.basketId !== basketId),
            activeBasketId: prev.activeBasketId === basketId ? (baskets[0]?.id ?? null) : prev.activeBasketId,
          };
        }),

      renameBasket: (basketId, label) =>
        setState((prev) => ({
          ...prev,
          baskets: prev.baskets.map((b) => (b.id === basketId ? { ...b, label } : b)),
        })),

      linesForBasket: (basketId) => lines.filter((l) => l.basketId === basketId),

      basketSubtotal: (basketId) =>
        lines.filter((l) => l.basketId === basketId).reduce((sum, l) => sum + l.unitPrice * l.qty, 0),

      clear: () => setState(EMPTY_STATE),
    };
  }, [state]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
