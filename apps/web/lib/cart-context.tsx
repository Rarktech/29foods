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
}

interface CartContextValue {
  baskets: CartBasket[];
  lines: CartLine[];
  /** Adds to the given basket, or the first/default basket (creating one) if omitted. */
  addItem: (item: Omit<CartLine, "qty" | "basketId"> & { basketId?: string }, qty?: number) => void;
  updateQty: (basketId: string, menuItemId: string, qty: number, addonId?: string) => void;
  removeItem: (basketId: string, menuItemId: string, addonId?: string) => void;
  /** Home's quick +/− doesn't know about baskets — drops the item from wherever it first appears. */
  removeItemAnyBasket: (menuItemId: string) => void;
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

const EMPTY_STATE: CartState = { baskets: [], lines: [] };

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
    const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.qty, 0);
    const itemCount = lines.reduce((sum, l) => sum + l.qty, 0);

    return {
      baskets,
      lines,
      subtotal,
      itemCount,

      addItem: (item, qty = 1) => {
        setState((prev) => {
          let baskets = prev.baskets;
          let basketId = item.basketId ?? baskets[0]?.id;
          if (!basketId) {
            basketId = makeBasketId();
            baskets = [...baskets, { id: basketId, label: "Me" }];
          }

          const matches = (l: CartLine) => l.basketId === basketId && l.menuItemId === item.menuItemId && l.addonId === item.addonId;
          const existing = prev.lines.find(matches);
          const lines = existing
            ? prev.lines.map((l) => (matches(l) ? { ...l, qty: l.qty + qty } : l))
            : [...prev.lines, { ...item, basketId, qty }];

          return { baskets, lines };
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

      removeItemAnyBasket: (menuItemId) =>
        setState((prev) => {
          const idx = prev.lines.findIndex((l) => l.menuItemId === menuItemId);
          if (idx === -1) return prev;
          return { ...prev, lines: prev.lines.filter((_, i) => i !== idx) };
        }),

      addBasket: (label) => {
        const id = makeBasketId();
        setState((prev) => ({
          ...prev,
          baskets: [...prev.baskets, { id, label: label ?? `Basket ${prev.baskets.length + 1}` }],
        }));
        return id;
      },

      removeBasket: (basketId) =>
        setState((prev) => ({
          baskets: prev.baskets.filter((b) => b.id !== basketId),
          lines: prev.lines.filter((l) => l.basketId !== basketId),
        })),

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
