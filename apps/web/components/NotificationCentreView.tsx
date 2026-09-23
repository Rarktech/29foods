"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import dishPhoto from "@/public/images/menu/party-jollof.jpg";

export interface NotificationRow {
  id: string;
  kind: "order_delivered" | "deal" | "menu_drop" | "loyalty" | "cart_reminder" | "plan_renew" | "plan_expired" | "referral" | "winback";
  title: string;
  body: string;
  href: string | null;
  thumb_url: string | null;
  read: boolean;
  created_at: string;
}

export interface LiveOrder {
  orderId: string;
  shortOrderId: string;
  status: "paid" | "preparing" | "ready" | "out_for_delivery" | "delivered" | "cancelled" | "placed";
  dishSummary: string;
  lodge: string;
  room: string | null;
  riderName: string | null;
  riderPhone: string | null;
  createdAt: string;
  // When the order first entered each UI stage — drives the card's "time" header and,
  // for "delivered", the ETA pill's absolute clock time. Missing entries (a stage not
  // reached yet, or historical orders predating this tracking) fall back to createdAt.
  stageEnteredAt: Partial<Record<"paid" | "ready" | "out_for_delivery" | "delivered", string | null>>;
}

type Filter = "all" | "orders" | "offers";

const CAT: Record<NotificationRow["kind"], "orders" | "offers"> = {
  order_delivered: "orders",
  plan_renew: "orders",
  plan_expired: "orders",
  cart_reminder: "orders",
  deal: "offers",
  menu_drop: "offers",
  loyalty: "offers",
  referral: "offers",
  winback: "offers",
};

const TONE: Record<NotificationRow["kind"], string> = {
  order_delivered: "text-success bg-success-bg",
  referral: "text-success bg-success-bg",
  deal: "text-accent bg-accent-tint",
  plan_expired: "text-accent bg-accent-tint",
  winback: "text-accent bg-accent-tint",
  menu_drop: "text-[#B26A00] dark:text-[#FFB25C] bg-[#FFF0DA] dark:bg-[#2A2016]",
  plan_renew: "text-[#B26A00] dark:text-[#FFB25C] bg-[#FFF0DA] dark:bg-[#2A2016]",
  loyalty: "text-[#B26A00] dark:text-[#FFB25C] bg-[#FFF0DA] dark:bg-[#2A2016]",
  cart_reminder: "text-body bg-[#F1E8DC] dark:bg-[#1F1F1F]",
};

// Stage index per order_status — 'preparing' shares stage 0 with 'paid' since it's an
// interstitial kitchen state, not its own UI step (matches OrderStatusTracker's mapping).
const STAGE_INDEX: Record<LiveOrder["status"], number> = {
  placed: -1, paid: 0, preparing: 0, ready: 1, out_for_delivery: 2, delivered: 3, cancelled: -1,
};
const LIVE_STEPS = [
  { label: "Preparing" },
  { label: "Rider assigned" },
  { label: "On the way" },
  { label: "Delivered" },
] as const;

function KindIcon({ kind, className }: { kind: NotificationRow["kind"]; className?: string }) {
  const props = { width: 17, height: 17, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2.2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, className };
  switch (kind) {
    case "order_delivered":
      return <svg {...props}><path d="M20 6 9 17l-5-5" /></svg>;
    case "deal":
    case "plan_expired":
    case "winback":
      if (kind === "winback") return <svg {...props}><path d="M20.8 5.6a5.2 5.2 0 0 0-7.4 0L12 7l-1.4-1.4a5.2 5.2 0 1 0-7.4 7.4L12 21.4l8.8-8.4a5.2 5.2 0 0 0 0-7.4Z" /></svg>;
      if (kind === "plan_expired") return <svg {...props}><path d="m12 3 9.5 17H2.5Z" /><path d="M12 10v4" /><path d="M12 17h.01" /></svg>;
      return <svg {...props}><path d="m20.59 13.41-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82Z" /><circle cx="7.5" cy="7.5" r="1.3" /></svg>;
    case "menu_drop":
      return <svg {...props}><path d="M3 2v7a3 3 0 0 0 6 0V2" /><path d="M6 12v10" /><path d="M18 2c-2 1.6-3 3.8-3 6.5 0 2 1 3.3 3 3.5v10" /></svg>;
    case "plan_renew":
      return <svg {...props}><path d="M3 5h18v16H3z" /><path d="M3 10h18" /><path d="M8 2v4" /><path d="M16 2v4" /><path d="M9.5 15.5a2.8 2.8 0 0 1 4.8-1.6" /><path d="M14.5 12.5v2h-2" /></svg>;
    case "cart_reminder":
      return <svg {...props}><circle cx="9" cy="20" r="1.2" /><circle cx="18" cy="20" r="1.2" /><path d="M2.5 3h2.2l2.5 11.6a1.8 1.8 0 0 0 1.8 1.4h8.6a1.8 1.8 0 0 0 1.8-1.4L21 7.5H6" /></svg>;
    case "loyalty":
      return <svg {...props}><path d="m12 2.6 2.9 5.9 6.5 1-4.7 4.6 1.1 6.5-5.8-3.1-5.8 3.1 1.1-6.5L2.6 9.5l6.5-1Z" /></svg>;
    case "referral":
      return <svg {...props}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16.5 3.3a4 4 0 0 1 0 7.4" /></svg>;
  }
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60_000);
  if (min < 1) return "now";
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const days = Math.floor(hr / 24);
  const d = new Date(iso);
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()]!;
  return days === 1 ? "Yesterday" : weekday;
}

function dayGroup(iso: string): "today" | "yesterday" | "earlier" {
  const d = new Date(iso);
  const now = new Date();
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOf(now) - startOf(d)) / 86_400_000);
  if (diffDays <= 0) return "today";
  if (diffDays === 1) return "yesterday";
  return "earlier";
}

function formatClockTime(iso: string): string {
  const d = new Date(iso);
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const ampm = h >= 12 ? "pm" : "am";
  h = h % 12 || 12;
  return `${h}:${m}${ampm}`;
}

const STAGE_KEYS = ["paid", "ready", "out_for_delivery", "delivered"] as const;
const STAGE_RIDER_NOTE = ["", "Rider · leaving the kitchen", "Rider · on the way", "Rider · delivered your order"];

function liveCardCopy(live: LiveOrder, stage: number): string {
  const place = `${live.lodge}${live.room ? `, ${live.room}` : ""}`;
  const rider = live.riderName ?? "Your rider";
  switch (stage) {
    case 0:
      return `Your ${live.dishSummary} is on the fire. We’ll ping you the moment a rider picks it up.`;
    case 1:
      return `${rider} has your ${live.dishSummary} and is leaving the kitchen.`;
    case 2:
      return `${rider} is close to ${place}. Keep your phone close for the gate.`;
    default:
      return `Handed to you at ${place}. Tap to rate the plate${live.riderName ? ` and ${live.riderName}` : ""}.`;
  }
}

function LiveOrderCard({ live }: { live: LiveOrder }) {
  const currentStage = Math.max(0, STAGE_INDEX[live.status]);
  const isDone = currentStage === 3;
  const minutesElapsed = Math.floor((Date.now() - new Date(live.createdAt).getTime()) / 60_000);
  const minutesRemaining = Math.max(0, 30 - minutesElapsed);
  const liveSteps = LIVE_STEPS.map((step, i) => ({
    ...step,
    done: i < currentStage || isDone,
    current: i === currentStage && !isDone,
  }));
  const stageEnteredIso = live.stageEnteredAt[STAGE_KEYS[currentStage]!] ?? live.createdAt;
  const cardBorderCls = isDone ? "border-success" : "border-border";
  const ringCls = isDone ? "border-success" : "border-accent";
  const pipBg = isDone ? "bg-success" : "bg-[#FFB25C]";
  const etaCls = isDone ? "bg-success-bg text-success" : "bg-accent-tint text-accent";

  return (
    <div className={`overflow-hidden rounded-[20px] border bg-card p-[15px] pb-3.5 shadow-[0_4px_14px_rgba(60,40,20,0.08)] ${cardBorderCls}`}>
    <Link href={`/order/${live.orderId}`} className="block">
      <div className="mb-3 flex items-center gap-2">
        <img src="/icons/icon-192.png" alt="" className="h-[17px] w-[17px] shrink-0 rounded object-contain" />
        <span className="text-[10px] font-extrabold tracking-[0.08em] text-muted">29FOODS</span>
        <span className="text-[10px] font-bold text-muted">{live.shortOrderId}</span>
        <span className="flex-grow" />
        <span className="text-[10px] font-semibold text-muted">{stageEnteredIso ? timeAgo(stageEnteredIso) : "now"}</span>
      </div>

      <div className="mb-3.5 flex items-start gap-[13px]">
        <div className="relative shrink-0">
          <div className={`h-14 w-14 overflow-hidden rounded-full border-[2.5px] ${ringCls}`}>
            <Image src={dishPhoto} alt="" width={56} height={56} className="h-full w-full object-cover" />
          </div>
          <span className={`absolute bottom-0 right-0 flex h-[18px] w-[18px] items-center justify-center rounded-full border-[2.5px] border-card ${pipBg}`}>
            {isDone ? (
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="4.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
            ) : (
              <span className="h-[6px] w-[6px] rounded-full bg-[#1A1613]" />
            )}
          </span>
        </div>
        <div className="min-w-0 flex-grow">
          <div className="text-[16px] font-extrabold tracking-[-0.01em] text-heading">{LIVE_STEPS[currentStage]!.label}</div>
          <div className="mt-[3px] text-[12px] leading-[1.4] text-body">{liveCardCopy(live, currentStage)}</div>
          <div className={`mt-[9px] inline-flex items-center gap-1.5 rounded-full px-[11px] py-[5px] ${etaCls}`}>
            {isDone ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg>
            )}
            <span className="text-[11.5px] font-extrabold">
              {isDone
                ? `Delivered · ${live.stageEnteredAt.delivered ? formatClockTime(live.stageEnteredAt.delivered) : ""}`
                : `Arriving in ${minutesRemaining} min`}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-start">
        {liveSteps.map((step, i) => (
          <div key={step.label} className="box-border flex min-w-0 items-start" style={{ flexGrow: i === 0 ? 0 : 1 }}>
            {i > 0 && <div className={`mt-3 h-0.5 flex-grow ${i <= currentStage ? "bg-accent" : "bg-[#D8CBB9] dark:bg-[#3A332C]"}`} />}
            <div className="flex w-[60px] shrink-0 flex-col items-center gap-[5px]">
              <div
                className={`box-border flex h-[26px] w-[26px] items-center justify-center rounded-full border-2 ${
                  step.done
                    ? "border-accent bg-accent"
                    : step.current
                      ? "border-accent bg-card"
                      : "border-[#D8CBB9] bg-[#D8CBB9] dark:border-[#3A332C] dark:bg-[#3A332C]"
                }`}
              >
                {step.done ? (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                ) : (
                  <span className={`text-[11px] font-extrabold ${step.current ? "text-accent" : "text-muted"}`}>{i + 1}</span>
                )}
              </div>
              <span className={`text-center text-[8.5px] leading-[1.2] ${step.current ? "font-extrabold text-heading" : step.done ? "font-bold text-accent" : "font-semibold text-muted"}`}>
                {step.label}
              </span>
            </div>
          </div>
        ))}
      </div>

    </Link>
      {currentStage >= 1 && live.riderName && (
        <div className="mt-[13px] flex items-center gap-2.5 rounded-[14px] bg-[#F1E8DC] px-[11px] py-[9px] dark:bg-[#1F1F1F]">
          <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-accent">
            <span className="text-[12px] font-extrabold text-white">{live.riderName.charAt(0)}</span>
          </div>
          <div className="min-w-0 flex-grow">
            <div className="text-[12.5px] font-extrabold text-heading">{live.riderName}</div>
            <div className="text-[10.5px] text-muted">{STAGE_RIDER_NOTE[currentStage]}</div>
          </div>
          {live.riderPhone ? (
            <a
              href={`tel:${live.riderPhone}`}
              aria-label={`Call ${live.riderName}`}
              className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-success-bg"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--color-success))" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z" /></svg>
            </a>
          ) : (
            <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-success-bg">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--color-success))" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z" /></svg>
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export function NotificationCentreView({ initialNotifications, initialLive }: { initialNotifications: NotificationRow[]; initialLive: LiveOrder[] }) {
  const [items, setItems] = useState(initialNotifications);
  const [filter, setFilter] = useState<Filter>("all");
  const [liveOrders, setLiveOrders] = useState(initialLive);

  const liveOrderIds = liveOrders.map((o) => o.orderId).join(",");
  useEffect(() => {
    if (!liveOrderIds) return;
    const supabase = getSupabaseBrowserClient();
    const isStageKey = (s: string): s is (typeof STAGE_KEYS)[number] => (STAGE_KEYS as readonly string[]).includes(s);
    const channels = liveOrderIds.split(",").map((orderId) =>
      supabase
        .channel(`notif-live-${orderId}`)
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${orderId}` }, (payload) => {
          const status = payload.new.order_status as LiveOrder["status"];
          if (status === "cancelled") {
            setLiveOrders((prev) => prev.filter((o) => o.orderId !== orderId));
            return;
          }
          // "Delivered" is a real, displayed 4th stage (green/done) — the card stays up
          // for the rest of this session instead of disappearing the instant it lands.
          const now = new Date().toISOString();
          setLiveOrders((prev) =>
            prev.map((o) =>
              o.orderId === orderId
                ? { ...o, status, stageEnteredAt: isStageKey(status) ? { ...o.stageEnteredAt, [status]: now } : o.stageEnteredAt }
                : o,
            ),
          );

          // riders is admin-only RLS — the client can't see a newly-assigned rider's
          // name/phone from the realtime payload itself, so backfill it once the order
          // reaches a stage that should have one.
          if (STAGE_INDEX[status] >= 1) {
            fetch(`/api/orders/${orderId}/rider`)
              .then((r) => r.json())
              .then((data: { rider?: { name: string; phone: string | null } | null }) => {
                if (!data.rider) return;
                setLiveOrders((prev) =>
                  prev.map((o) => (o.orderId === orderId ? { ...o, riderName: data.rider!.name, riderPhone: data.rider!.phone } : o)),
                );
              })
              .catch(() => {});
          }
        })
        .subscribe(),
    );
    return () => {
      channels.forEach((c) => supabase.removeChannel(c));
    };
  }, [liveOrderIds]);

  async function markRead(id: string) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    fetch("/api/notifications/mark-read", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }).catch(() => {});
  }

  async function markAllRead() {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    fetch("/api/notifications/mark-read", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ all: true }) }).catch(() => {});
  }

  const filtered = useMemo(() => items.filter((n) => filter === "all" || CAT[n.kind] === filter), [items, filter]);
  const showLive = liveOrders.length > 0 && filter !== "offers";

  const groups = useMemo(() => {
    const buckets: Record<"today" | "yesterday" | "earlier", NotificationRow[]> = { today: [], yesterday: [], earlier: [] };
    for (const n of filtered) buckets[dayGroup(n.created_at)].push(n);
    return [
      { id: "today", label: "Today", items: buckets.today },
      { id: "yesterday", label: "Yesterday", items: buckets.yesterday },
      { id: "earlier", label: "Earlier this week", items: buckets.earlier },
    ].filter((g) => g.items.length > 0);
  }, [filtered]);

  const unreadCount = items.filter((n) => !n.read).length + (showLive ? liveOrders.length : 0);
  const hasAnythingEver = items.length > 0 || initialLive.length > 0;
  const filterEmpty = groups.length === 0 && !showLive;

  return (
    <div className="flex h-screen flex-col bg-bg">
      <div className="flex shrink-0 items-center gap-3 border-b border-[#F3E8DA] px-[18px] py-4 pb-3 dark:border-border">
        <Link href="/" aria-label="Back" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-card">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--color-heading))" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </Link>
        <h1 className="flex-grow text-[18px] font-extrabold text-heading">Notifications</h1>
        <button onClick={markAllRead} className="shrink-0 px-0.5 py-1.5 text-[12.5px] font-bold text-accent">Mark all read</button>
      </div>

      <div className="flex shrink-0 gap-2 px-[18px] pb-2.5 pt-3">
        {(["all", "orders", "offers"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full border px-4 py-2 text-[12.5px] ${filter === f ? "border-heading bg-heading font-bold text-bg" : "border-border bg-card font-semibold text-body"}`}
          >
            {f === "all" ? "All" : f === "orders" ? "Orders" : "Offers"}
          </button>
        ))}
        <span className="flex-grow" />
        {unreadCount > 0 && (
          <span className="self-center rounded-full bg-accent-tint px-2.5 py-1 text-[10.5px] font-extrabold text-accent">{unreadCount} new</span>
        )}
      </div>

      <div className="scrollbar-none flex-grow overflow-y-auto px-[18px] pb-[34px] pt-1">
        {showLive && (
          <div className="mb-[18px]">
            <p className="mb-2.5 text-[10.5px] font-extrabold uppercase tracking-[0.09em] text-muted">Today</p>
            <div className="flex flex-col gap-3">
              {liveOrders.map((live) => (
                <LiveOrderCard key={live.orderId} live={live} />
              ))}
            </div>
          </div>
        )}

        {groups.map((g) => (
          <div key={g.id} className="mb-1">
            {!(g.id === "today" && showLive) && (
              <p className="mb-2.5 mt-2.5 text-[10.5px] font-extrabold uppercase tracking-[0.09em] text-muted">{g.label}</p>
            )}
            {g.items.map((n) => (
              <Link
                key={n.id}
                href={n.href ?? "/"}
                onClick={() => markRead(n.id)}
                className={`mb-2 flex items-start gap-[11px] rounded-2xl border p-3 px-[13px] ${n.read ? "border-border bg-card" : "border-[#F5D6D2] bg-accent-tint dark:border-[#3A1F1A]"}`}
              >
                <div className="relative shrink-0">
                  <div className={`flex h-[34px] w-[34px] items-center justify-center rounded-full ${TONE[n.kind]}`}>
                    <KindIcon kind={n.kind} />
                  </div>
                  {!n.read && <span className="absolute -right-px -top-px h-[9px] w-[9px] rounded-full bg-accent ring-2 ring-accent-tint" />}
                </div>
                <div className="min-w-0 flex-grow">
                  <div className="flex items-baseline gap-2">
                    <span className={`flex-grow text-[13.5px] ${n.read ? "font-semibold text-body" : "font-extrabold text-heading"}`}>{n.title}</span>
                    <span className="shrink-0 text-[10.5px] font-semibold text-muted">{timeAgo(n.created_at)}</span>
                  </div>
                  <div className={`mt-[3px] text-[12px] leading-[1.38] ${n.read ? "text-muted" : "text-body"}`}>{n.body}</div>
                </div>
                {n.thumb_url && <img src={n.thumb_url} alt="" className="h-10 w-10 shrink-0 rounded-[11px] object-cover" />}
              </Link>
            ))}
          </div>
        ))}

        {filterEmpty && hasAnythingEver && (
          <div className="px-6 py-[42px] pb-[30px] text-center">
            <div className="mx-auto mb-3.5 flex h-16 w-16 items-center justify-center rounded-full bg-border">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--color-muted))" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
            </div>
            <p className="mb-1.5 text-[15px] font-extrabold text-heading">Nothing here yet</p>
            <p className="text-[12.5px] leading-[1.45] text-muted">
              {filter === "offers" ? "No deals running right now. We drop the evening menu around 4:00pm." : "No order updates right now."}
            </p>
          </div>
        )}

        {!hasAnythingEver && (
          <div className="rounded-[18px] border border-dashed border-border bg-card px-6 py-[30px] text-center">
            <div className="mx-auto mb-3.5 flex h-16 w-16 items-center justify-center rounded-full bg-border">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--color-muted))" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
            </div>
            <p className="mb-1.5 text-[15px] font-extrabold text-heading">No notifications yet</p>
            <p className="mb-4 text-[12.5px] leading-[1.45] text-muted">Order something and we&rsquo;ll keep you posted from the kitchen to your door.</p>
            <Link href="/" className="inline-flex items-center gap-1.5 rounded-full bg-accent px-5 py-[11px]">
              <span className="text-[13px] font-bold text-white">Browse tonight&rsquo;s menu</span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
