"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export interface CartLine {
  menuItemId: string;
  name: string;
  unitPrice: number; // kobo
  qty: number;
  imageUrl: string | null;
}

interface CartContextValue {
  lines: CartLine[];
  addItem: (item: Omit<CartLine, "qty">, qty?: number) => void;
  updateQty: (menuItemId: string, qty: number) => void;
  removeItem: (menuItemId: string) => void;
  clear: () => void;
  subtotal: number;
  itemCount: number;
}

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "29foods.cart.v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setLines(JSON.parse(raw));
    } catch {
      // corrupt/blocked storage — start with an empty cart rather than crash
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      // storage unavailable — cart just won't persist across reloads this session
    }
  }, [lines, hydrated]);

  const value = useMemo<CartContextValue>(() => {
    const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.qty, 0);
    const itemCount = lines.reduce((sum, l) => sum + l.qty, 0);

    return {
      lines,
      subtotal,
      itemCount,
      addItem: (item, qty = 1) => {
        setLines((prev) => {
          const existing = prev.find((l) => l.menuItemId === item.menuItemId);
          if (existing) {
            return prev.map((l) => (l.menuItemId === item.menuItemId ? { ...l, qty: l.qty + qty } : l));
          }
          return [...prev, { ...item, qty }];
        });
      },
      updateQty: (menuItemId, qty) => {
        setLines((prev) =>
          qty <= 0 ? prev.filter((l) => l.menuItemId !== menuItemId) : prev.map((l) => (l.menuItemId === menuItemId ? { ...l, qty } : l)),
        );
      },
      removeItem: (menuItemId) => setLines((prev) => prev.filter((l) => l.menuItemId !== menuItemId)),
      clear: () => setLines([]),
    };
  }, [lines]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
