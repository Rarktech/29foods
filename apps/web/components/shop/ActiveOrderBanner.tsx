"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type OrderStatus = "paid" | "preparing" | "ready" | "out_for_delivery" | "delivered" | "cancelled";

interface ActiveOrder {
  id: string;
  status: OrderStatus;
  createdAt: string;
}

const ETA_ORDER: OrderStatus[] = ["paid", "preparing", "ready", "out_for_delivery", "delivered"];
const STAGE_LABEL: Record<OrderStatus, string> = {
  paid: "Preparing",
  preparing: "Preparing",
  ready: "Rider assigned",
  out_for_delivery: "On the way",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const PILL_HEIGHT = 74; // pill height + gap, for stacking multiple pills above the tab bar
const DISMISSED_KEY = "29foods.dismissedOrderBanners";

function OrderPill({ order, now, bottom, onDismiss }: { order: ActiveOrder; now: number; bottom: number; onDismiss: (id: string) => void }) {
  const stepIndex = ETA_ORDER.indexOf(order.status);
  const minutesElapsed = Math.floor((now - new Date(order.createdAt).getTime()) / 60_000);
  const minutesRemaining = Math.max(0, 30 - minutesElapsed);
  const progressPct = Math.round(((stepIndex + 1) / ETA_ORDER.length) * 100);

  return (
    <div className="absolute inset-x-4 z-20" style={{ bottom }}>
      <Link
        href={`/order/${order.id}`}
        className="flex items-center gap-2.5 overflow-hidden rounded-2xl border border-transparent py-[11px] pl-[13px] pr-9 shadow-[0_10px_24px_rgba(60,40,20,0.08)] dark:border-border"
        style={{ background: "linear-gradient(135deg, #1A1613 0%, #2A2119 100%)" }}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-[#FFB25C] bg-[#2A2119]">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#FFB25C" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
        </div>
        <div className="min-w-0 flex-grow">
          <div className="flex items-baseline gap-[7px]">
            <span className="text-[12.5px] font-extrabold text-white">{STAGE_LABEL[order.status]}</span>
            <span className="text-[11px] font-bold text-[#FFB25C]">{minutesRemaining} min</span>
            <span className="flex-grow" />
            <span className="text-[10px] font-semibold text-[#B4A796]">#29F-{order.id.slice(0, 4).toUpperCase()}</span>
          </div>
          <div className="mt-[7px] h-1 overflow-hidden rounded-full bg-[#3A332C]">
            <div className="h-full rounded-full bg-[#FFB25C]" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      </Link>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDismiss(order.id);
        }}
        aria-label="Dismiss"
        className="absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#FFB25C" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
      </button>
    </div>
  );
}

/**
 * Sticky pill stack that sits above the bottom tab bar on every screen while any
 * order is live — per the "Sticky in-app banner" spec (Live order-progress notification
 * reference), extended to show one pill per concurrently active order rather than only
 * the most recent, and dismissible per order (a close X, not a link) so it doesn't sit
 * stuck on screen for the rest of the order. A dismissed pill stays hidden for the rest
 * of this browser session (sessionStorage) — it comes back on the next visit.
 */
export function ActiveOrderBanner() {
  const pathname = usePathname();
  const [orders, setOrders] = useState<ActiveOrder[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DISMISSED_KEY);
      if (raw) setDismissed(new Set(JSON.parse(raw)));
    } catch {
      // ignore — dismiss state is a convenience, not critical
    }
  }, []);

  function dismiss(id: string) {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      try {
        sessionStorage.setItem(DISMISSED_KEY, JSON.stringify([...next]));
      } catch {
        // ignore
      }
      return next;
    });
  }

  useEffect(() => {
    let cancelled = false;
    const supabase = getSupabaseBrowserClient();

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const { data } = await supabase
        .from("orders")
        .select("id, order_status, created_at")
        .not("order_status", "in", "(delivered,cancelled,placed)")
        .order("created_at", { ascending: false });
      if (!cancelled && data) {
        setOrders(data.map((d) => ({ id: d.id, status: d.order_status as OrderStatus, createdAt: d.created_at })));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const orderIds = orders.map((o) => o.id).join(",");
  useEffect(() => {
    if (!orderIds) return;
    const supabase = getSupabaseBrowserClient();
    const channels = orderIds.split(",").map((id) =>
      supabase
        .channel(`banner-${id}`)
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${id}` }, (payload) => {
          const status = payload.new.order_status as OrderStatus;
          if (status === "delivered" || status === "cancelled") {
            setOrders((prev) => prev.filter((o) => o.id !== id));
          } else {
            setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
          }
        })
        .subscribe(),
    );
    return () => {
      channels.forEach((c) => supabase.removeChannel(c));
    };
  }, [orderIds]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, []);

  // Hidden entirely on the Notification Centre (which already surfaces every live order
  // as its own hero card), and each pill is hidden on its own order's tracking page or once dismissed.
  if (pathname === "/notifications") return null;
  const visible = orders.filter((o) => pathname !== `/order/${o.id}` && !dismissed.has(o.id));
  if (visible.length === 0) return null;

  return (
    <>
      {visible.map((order, i) => (
        <OrderPill key={order.id} order={order} now={now} bottom={92 + i * PILL_HEIGHT} onDismiss={dismiss} />
      ))}
    </>
  );
}
