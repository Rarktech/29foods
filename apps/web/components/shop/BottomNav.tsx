"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/lib/cart-context";

const NAV_ITEMS = [
  {
    href: "/",
    label: "Home",
    match: (path: string) => path === "/",
    icon: (color: string) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      </svg>
    ),
  },
  {
    href: "/orders",
    label: "Orders",
    match: (path: string) => path.startsWith("/orders") || path.startsWith("/order/"),
    icon: (color: string) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
        <path d="M3 6h18" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
    ),
  },
  {
    href: "/cart",
    label: "Cart",
    match: (path: string) => path === "/cart",
    icon: (color: string) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8" cy="21" r="1" />
        <circle cx="19" cy="21" r="1" />
        <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 2-1.58l1.65-7.42H5.12" />
      </svg>
    ),
  },
  {
    href: "/account",
    label: "You",
    match: (path: string) => path.startsWith("/account"),
    icon: (color: string) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="5" />
        <path d="M20 21a8 8 0 0 0-16 0" />
      </svg>
    ),
  },
];

/** Floating glass bottom nav, present on every screen except the two confirmation screens. */
export function BottomNav() {
  const pathname = usePathname();
  const { itemCount } = useCart();

  return (
    <div
      style={{
        position: "absolute",
        left: 16,
        right: 16,
        bottom: 18,
        borderRadius: 26,
        background: "var(--nav-bg)",
        backdropFilter: "blur(18px) saturate(1.6)",
        WebkitBackdropFilter: "blur(18px) saturate(1.6)",
        border: "1px solid var(--nav-border)",
        boxShadow: "var(--nav-shadow)",
        padding: "12px 22px",
        display: "flex",
        justifyContent: "space-between",
      }}
    >
      {NAV_ITEMS.map((item) => {
        const active = item.match(pathname);
        const color = active ? "rgb(var(--color-accent))" : "rgb(var(--color-muted))";
        return (
          <Link
            key={item.href}
            href={item.href}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, position: "relative" }}
          >
            {item.icon(color)}
            <span style={{ fontSize: 10, fontWeight: active ? 700 : 600, color }}>{item.label}</span>
            {item.href === "/cart" && itemCount > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: -4,
                  right: -6,
                  width: 15,
                  height: 15,
                  background: "rgb(var(--color-accent))",
                  borderRadius: 999,
                  color: "#FFFFFF",
                  fontSize: 9,
                  fontWeight: 800,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 0 0 2px var(--badge-ring)",
                }}
              >
                {itemCount}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
