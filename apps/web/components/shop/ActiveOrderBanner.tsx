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

/**
 * Sticky pill that sits above the bottom tab bar on every screen while an order
 * is live — per the "Sticky in-app banner" spec (Live order-progress notification
 * reference). Self-contained: does its own client-side lookup + realtime watch so
 * it works regardless of whether the current page renders its own BottomNav.
 */
export function ActiveOrderBanner() {
  const pathname = usePathname();
  const [order, setOrder] = useState<ActiveOrder | null>(null);
  const [now, setNow] = useState(() => Date.now());

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
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!cancelled && data) setOrder({ id: data.id, status: data.order_status as OrderStatus, createdAt: data.created_at });
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!order) return;
    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel(`banner-${order.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${order.id}` }, (payload) => {
        const status = payload.new.order_status as OrderStatus;
        setOrder((prev) => (status === "delivered" || status === "cancelled" ? null : prev ? { ...prev, status } : prev));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [order?.id]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, []);

  // Hidden on the order's own tracking page (redundant with the full tracker) and on
  // the Notification Centre (which already surfaces the same live order as its hero card).
  if (!order || pathname === `/order/${order.id}` || pathname === "/notifications") return null;

  const stepIndex = ETA_ORDER.indexOf(order.status);
  const minutesElapsed = Math.floor((now - new Date(order.createdAt).getTime()) / 60_000);
  const minutesRemaining = Math.max(0, 30 - minutesElapsed);
  const progressPct = Math.round(((stepIndex + 1) / ETA_ORDER.length) * 100);

  return (
    <Link
      href={`/order/${order.id}`}
      className="absolute inset-x-4 z-20 flex items-center gap-2.5 overflow-hidden rounded-2xl border border-transparent p-[11px] px-[13px] shadow-[0_10px_24px_rgba(60,40,20,0.08)] dark:border-border"
      style={{ bottom: 92, background: "linear-gradient(135deg, #1A1613 0%, #2A2119 100%)" }}
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
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFB25C" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M9 18l6-6-6-6" /></svg>
    </Link>
  );
}
