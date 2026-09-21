"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatKobo } from "@/lib/format";
import partyJollof from "@/public/images/menu/party-jollof.jpg";

type OrderStatus = "placed" | "paid" | "preparing" | "ready" | "out_for_delivery" | "delivered" | "cancelled";

export interface OrderItemSnapshot {
  menu_item_id: string;
  name: string;
  qty: number;
  unit_price: number;
  basket_label?: string;
}

const ETA_STEPS: { label: string; primaryStatus: OrderStatus }[] = [
  { label: "Preparing", primaryStatus: "paid" },
  { label: "Rider assigned", primaryStatus: "ready" },
  { label: "On the way", primaryStatus: "out_for_delivery" },
  { label: "Delivered", primaryStatus: "delivered" },
];
const ETA_ORDER: OrderStatus[] = ["paid", "preparing", "ready", "out_for_delivery", "delivered"];

export function OrderStatusTracker(props: {
  orderId: string;
  initialStatus: OrderStatus;
  items: OrderItemSnapshot[];
  total: number;
  lodge: string;
  room: string | null;
  createdAt: string;
  assignedRiderId: string | null;
}) {
  const [status, setStatus] = useState<OrderStatus>(props.initialStatus);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel(`order-${props.orderId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${props.orderId}` },
        (payload) => setStatus(payload.new.order_status as OrderStatus),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [props.orderId]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, []);

  const baskets = useMemo(() => {
    const map = new Map<string, OrderItemSnapshot[]>();
    for (const item of props.items) {
      const key = item.basket_label ?? "Order";
      map.set(key, [...(map.get(key) ?? []), item]);
    }
    return [...map.entries()];
  }, [props.items]);

  if (status === "placed") {
    return (
      <div className="flex flex-grow flex-col items-center justify-center gap-2 px-8 text-center">
        <p className="text-heading">Waiting for payment confirmation…</p>
        <p className="text-sm text-muted">This updates automatically once payment clears.</p>
      </div>
    );
  }
  if (status === "cancelled") {
    return (
      <div className="flex flex-grow flex-col items-center justify-center gap-3 px-8 text-center">
        <p className="font-bold text-accent">This order was cancelled.</p>
        <Link href="/" className="font-bold text-accent">
          Back to menu
        </Link>
      </div>
    );
  }

  const currentIndex = ETA_ORDER.indexOf(status);
  const minutesElapsed = Math.floor((now - new Date(props.createdAt).getTime()) / 60_000);
  const minutesRemaining = status === "delivered" ? 0 : Math.max(0, 30 - minutesElapsed);
  const basketCount = baskets.length;
  const basketWord = basketCount === 1 ? "basket" : "baskets";

  return (
    <div className="scrollbar-none flex flex-grow flex-col items-center overflow-y-auto px-[22px] pb-6 pt-9">
      <div className="relative mb-[18px] flex h-[88px] w-[88px] items-center justify-center">
        {status !== "delivered" && (
          <div className="check-ring absolute inset-0 rounded-full" style={{ border: "2px solid rgb(var(--color-success))" }} />
        )}
        <div
          className="check-badge flex h-[76px] w-[76px] items-center justify-center rounded-full"
          style={{
            background: "linear-gradient(150deg, #2E9159 0%, #1F7A45 100%)",
            boxShadow: "0 10px 24px rgba(31,122,69,0.35)",
          }}
        >
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
      </div>

      <h1 className="mb-1.5 flex items-center justify-center gap-2 text-center text-[22px] font-extrabold text-heading">
        {status === "delivered" ? `${basketCount} ${basketWord} delivered!` : `${basketCount} ${basketWord} on the way!`}
        <svg width="19" height="19" viewBox="0 0 24 24" fill="rgb(var(--color-accent))" stroke="none" className="shrink-0">
          <path d="M12 2c1 3-2 4-2 7a3 3 0 0 0 6 0c1.5 1.5 2 3.5 2 5a6 6 0 0 1-12 0c0-4 3-5 3-8 0-1.5.5-3 3-4z" />
        </svg>
      </h1>
      <p className="mb-[22px] text-center text-[13px] text-muted">
        {basketCount > 1 ? "All packs are labeled and already in the kitchen" : "Your pack is labeled and already in the kitchen"}
      </p>

      {/* ETA hero */}
      <div
        className="relative mb-4 w-full overflow-hidden rounded-[22px] px-5 py-[22px] text-center"
        style={{ background: "linear-gradient(135deg, #1A1613 0%, #2A2119 100%)" }}
      >
        <div className="pointer-events-none absolute -right-3.5 -top-3.5 h-[108px] w-[108px] overflow-hidden rounded-full border-[3px] border-white/[0.12]">
          <Image src={partyJollof} alt="" width={108} height={108} className="h-full w-full object-cover" />
        </div>
        <div className="relative z-[1] mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[#D8CBB9]">
          {status === "delivered" ? "Delivered" : "Arriving in"}
        </div>
        <div className="relative z-[1] mb-4 text-[40px] font-extrabold tracking-[-0.02em] text-[#FFB25C]">
          {status === "delivered" ? "🎉" : minutesRemaining}
          {status !== "delivered" && <span className="text-[18px] font-bold text-[#E8DCCB]"> min</span>}
        </div>
        <div className="relative z-[1] flex items-center gap-1.5">
          {ETA_STEPS.map((step, i) => {
            const stepIndex = ETA_ORDER.indexOf(step.primaryStatus);
            const done = currentIndex >= stepIndex;
            return (
              <div key={step.label} className="flex flex-grow items-center gap-1.5">
                <div className="flex flex-grow flex-col items-center gap-1.5">
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-extrabold"
                    style={{ background: done ? "#FFB25C" : "#3A332C", color: done ? "#1A1613" : "#8A7D6E" }}
                  >
                    {done ? "✓" : i + 1}
                  </div>
                  <span className="text-[9px] font-bold" style={{ color: done ? "#FFB25C" : "#8A7D6E" }}>
                    {step.label}
                  </span>
                </div>
                {i < ETA_STEPS.length - 1 && <div className="mb-[15px] h-0.5 flex-grow bg-[#3A332C]" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Unified order card */}
      <div className="mb-5 w-full overflow-hidden rounded-[22px] border border-border bg-card shadow-[0_10px_24px_rgba(60,40,20,0.08)]">
        <div className="flex items-center gap-3 border-b border-[#F1E8DC] px-[18px] py-[15px] dark:border-[#262626]">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--color-accent))" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span className="flex-grow text-[12.5px] font-semibold text-body">
            {props.lodge}
            {props.room ? `, ${props.room}` : ""} · one drop-off
          </span>
          <span className="text-[13px] font-extrabold text-heading">{formatKobo(props.total)}</span>
        </div>

        <div className="px-[18px] pb-[18px] pt-4">
          <h3 className="mb-3 text-[12.5px] font-bold uppercase tracking-[0.04em] text-muted">What&rsquo;s in your {basketWord}</h3>

          {baskets.map(([label, items], i) => {
            const basketTotal = items.reduce((sum, item) => sum + item.unit_price * item.qty, 0);
            return (
              <div key={label}>
                {i > 0 && <div className="my-3.5 h-px bg-[#F1E8DC] dark:bg-[#262626]" />}
                <div className="mb-1.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-extrabold text-white"
                      style={{ background: i === 0 ? "rgb(var(--color-accent))" : "rgb(var(--color-heading))" }}
                    >
                      {i + 1}
                    </span>
                    <span className="text-[13px] font-extrabold text-heading">{label}</span>
                  </div>
                  <span className="flex items-center gap-1 rounded-full bg-success-bg px-[9px] py-[3px] text-[9.5px] font-extrabold text-success">
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--color-success))" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                    PAID
                  </span>
                </div>
                <div className="flex flex-col gap-1 pl-7">
                  {items.map((item) => (
                    <div key={item.menu_item_id} className="flex justify-between text-xs text-body">
                      <span>
                        {item.qty > 1 ? `${item.qty} × ` : ""}
                        {item.name}
                      </span>
                      <span>{formatKobo(item.unit_price * item.qty)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between pt-1 text-[11.5px] font-bold text-heading">
                    <span>Basket total</span>
                    <span>{formatKobo(basketTotal)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Link
        href="/"
        className="mb-2.5 flex w-full items-center justify-center gap-2 rounded-2xl bg-accent px-5 py-4 shadow-[0_6px_16px_rgba(196,30,30,0.28)]"
      >
        <span className="text-[14.5px] font-bold text-white">Back to menu</span>
      </Link>
      <a href="mailto:help@29foods.app" className="p-2 text-[13px] font-bold text-muted">
        Get help with this order
      </a>

      {status === "delivered" && <FeedbackPrompt orderId={props.orderId} />}
    </div>
  );
}

function FeedbackPrompt({ orderId }: { orderId: string }) {
  const [sent, setSent] = useState(false);

  async function send(reaction: "fire" | "neutral" | "down") {
    setSent(true); // optimistic — this is a low-stakes reaction, not worth blocking on
    await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, reaction }),
    });
  }

  if (sent) return <p className="mt-2 text-center text-sm text-muted">Thanks for the feedback! 🙌</p>;

  return (
    <div className="mt-2 w-full rounded-2xl border border-border bg-card p-4 text-center">
      <p className="mb-3 font-bold text-heading">How was it?</p>
      <div className="flex justify-center gap-4 text-2xl">
        <button onClick={() => send("fire")} aria-label="Fire">
          🔥
        </button>
        <button onClick={() => send("neutral")} aria-label="Neutral">
          😐
        </button>
        <button onClick={() => send("down")} aria-label="Not good">
          👎
        </button>
      </div>
    </div>
  );
}
