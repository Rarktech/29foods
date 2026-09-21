"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatKobo } from "@/lib/format";
import { getMenuImage } from "@/lib/menu-images";
import { PLAN_DURATIONS } from "@29foods/core";
import { BottomNav } from "@/components/shop/BottomNav";
import type { OrderItemSnapshot } from "@/components/OrderStatusTracker";

export interface OrderSummary {
  id: string;
  items: OrderItemSnapshot[];
  total: number;
  status: string;
  createdAt: string;
  isSubscriptionDelivery: boolean;
}

export interface SubscriptionSummary {
  id: string;
  durationId: string;
  status: string;
  startDate: string;
  endDate: string;
  deliveriesTotal: number;
  deliveriesUsed: number;
  totalPaid: number;
}

type Tab = "active" | "history" | "subscription";

const STATUS_LABEL: Record<string, string> = {
  placed: "AWAITING PAYMENT",
  paid: "CONFIRMED",
  preparing: "PREPARING",
  ready: "READY",
  out_for_delivery: "ON THE WAY",
};

export function OrdersView({
  active,
  history,
  subscriptions,
}: {
  active: OrderSummary[];
  history: OrderSummary[];
  subscriptions: SubscriptionSummary[];
}) {
  const [tab, setTab] = useState<Tab>(active.length > 0 ? "active" : "history");
  const activeSubscription = subscriptions.find((s) => s.status === "active");

  return (
    <>
      <div className="flex items-center justify-between px-5 pb-3.5 pt-[18px]">
        <h1 className="text-xl font-extrabold text-heading">Your orders</h1>
        <button aria-label="Notifications" className="flex h-[38px] w-[38px] items-center justify-center rounded-full border border-border bg-card">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--color-heading))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </button>
      </div>

      <div className="flex gap-2 px-5 pb-4">
        {(
          [
            ["active", `Active${active.length ? ` (${active.length})` : ""}`],
            ["history", "History"],
            ["subscription", "Subscription"],
          ] as [Tab, string][]
        ).map(([value, label]) => {
          const isActive = tab === value;
          return (
            <button
              key={value}
              onClick={() => setTab(value)}
              className="shrink-0 rounded-full px-4 py-[9px] text-[12.5px]"
              style={{
                background: isActive ? "rgb(var(--color-heading))" : "rgb(var(--color-card))",
                color: isActive ? "rgb(var(--color-bg))" : "rgb(var(--color-body))",
                border: isActive ? "none" : "1px solid rgb(var(--color-border))",
                fontWeight: isActive ? 700 : 600,
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="scrollbar-none flex-grow overflow-y-auto pb-[118px]">
        <div className="px-5">
          {tab === "active" && (
            <ActiveTab orders={active} activeSubscription={activeSubscription} />
          )}
          {tab === "history" && <HistoryTab orders={history} />}
          {tab === "subscription" && <SubscriptionTab subscriptions={subscriptions} />}
        </div>
      </div>

      <BottomNav />
    </>
  );
}

function ActiveTab({ orders, activeSubscription }: { orders: OrderSummary[]; activeSubscription: SubscriptionSummary | undefined }) {
  if (orders.length === 0) {
    return (
      <>
        <EmptyNote text="No orders in progress right now." />
        <SubscriptionPromo />
      </>
    );
  }

  return (
    <>
      <div className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.06em] text-muted">In progress</div>
      <div className="mb-[22px] flex flex-col gap-3">
        {orders.map((order) => {
          const names = order.items.map((i) => i.name).join(", ");
          const basketCount = new Set(order.items.map((i) => i.basket_label ?? "Order")).size;
          return (
            <Link key={order.id} href={`/order/${order.id}`} className="relative block overflow-hidden rounded-[20px] bg-heading p-[18px]">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#FFB25C] shadow-[0_0_0_4px_rgba(255,178,92,0.25)]" />
                  <span className="text-xs font-bold tracking-[0.03em] text-[#FFB25C]">{STATUS_LABEL[order.status] ?? order.status.toUpperCase()}</span>
                </div>
                <span className="text-[11px] font-semibold text-[#B4A796]">#{order.id.slice(0, 6).toUpperCase()}</span>
              </div>
              <div className="mb-1 text-[15px] font-bold text-bg">
                {basketCount > 1 ? `${basketCount} baskets` : order.isSubscriptionDelivery ? "Plan delivery" : "Your order"}
              </div>
              <div className="mb-3.5 truncate text-xs text-[#B4A796]">{names}</div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#FFB25C]">In the kitchen</span>
                <span className="text-xs font-bold text-bg">{formatKobo(order.total)}</span>
              </div>
            </Link>
          );
        })}
      </div>
      {!activeSubscription && <SubscriptionPromo />}
    </>
  );
}

function HistoryTab({ orders }: { orders: OrderSummary[] }) {
  if (orders.length === 0) return <EmptyNote text="No past orders yet." />;

  return (
    <>
      <div className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.06em] text-muted">Past orders</div>
      <div className="mb-3 flex flex-col gap-3">
        {orders.map((order) => {
          const first = order.items[0];
          const img = first ? getMenuImage(first.name) : null;
          const label = order.items.length > 1 ? `${first?.name ?? "Order"} +${order.items.length - 1} more` : first?.name ?? "Order";
          return (
            <div key={order.id} className="flex gap-3 rounded-2xl border border-border bg-card p-3">
              {img ? (
                <Image src={img} alt={label} width={52} height={52} className="h-[52px] w-[52px] shrink-0 rounded-xl object-cover" />
              ) : (
                <div className="h-[52px] w-[52px] shrink-0 rounded-xl bg-border" />
              )}
              <div className="flex-grow">
                <div className="mb-0.5 flex items-center justify-between">
                  <span className="text-[13.5px] font-bold text-heading">{label}</span>
                  <span className="text-[13px] font-extrabold text-heading">{formatKobo(order.total)}</span>
                </div>
                <div className="mb-2 text-[11.5px] text-muted">{relativeDate(order.createdAt)}</div>
                <div className="flex items-center gap-2.5">
                  <span className="rounded-full bg-success-bg px-2 py-[3px] text-[10.5px] font-bold text-success">Delivered</span>
                  <Link href="/" className="text-[11.5px] font-bold text-accent">
                    Reorder
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function SubscriptionTab({ subscriptions }: { subscriptions: SubscriptionSummary[] }) {
  if (subscriptions.length === 0) {
    return (
      <>
        <EmptyNote text="You don't have a meal plan yet." />
        <SubscriptionPromo />
      </>
    );
  }

  return (
    <div className="mb-3 flex flex-col gap-3">
      {subscriptions.map((sub) => {
        const duration = PLAN_DURATIONS.find((d) => d.id === sub.durationId);
        const progress = sub.deliveriesTotal > 0 ? Math.min(100, Math.round((sub.deliveriesUsed / sub.deliveriesTotal) * 100)) : 0;
        return (
          <Link key={sub.id} href={`/plans/confirmed/${sub.id}`} className="block rounded-2xl border border-border bg-card p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[13.5px] font-bold text-heading">{duration?.label ?? "Meal plan"}</span>
              <span
                className="rounded-full px-2 py-[3px] text-[10px] font-bold uppercase"
                style={{
                  background: sub.status === "active" ? "rgb(var(--color-success-bg))" : "rgb(var(--color-border))",
                  color: sub.status === "active" ? "rgb(var(--color-success))" : "rgb(var(--color-muted))",
                }}
              >
                {sub.status.replace("_", " ")}
              </span>
            </div>
            {sub.status === "active" && (
              <>
                <div className="mb-1.5 h-1.5 overflow-hidden rounded-full bg-border">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${progress}%` }} />
                </div>
                <div className="text-[11.5px] text-muted">
                  {sub.deliveriesUsed} of {sub.deliveriesTotal} deliveries used
                </div>
              </>
            )}
          </Link>
        );
      })}
    </div>
  );
}

function SubscriptionPromo() {
  return (
    <Link
      href="/plans"
      className="relative mb-6 block overflow-hidden rounded-[20px] p-[18px]"
      style={{ background: "linear-gradient(135deg, rgb(var(--color-accent)) 0%, var(--hero-gradient-end) 100%)" }}
    >
      <div className="pointer-events-none absolute -bottom-[30px] -right-6 h-[130px] w-[130px] rounded-full bg-white/[0.08]" />
      <div className="relative z-[1] mb-2 flex items-center gap-2">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFD9A0" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
        </svg>
        <span className="text-[11px] font-extrabold uppercase tracking-[0.06em] text-[#FFD9A0]">Meal plans</span>
      </div>
      <h3 className="relative z-[1] mb-1.5 text-[17px] font-extrabold leading-[1.25] text-white">Too busy to cook? Let us handle it</h3>
      <p className="relative z-[1] mb-3.5 text-xs leading-[1.5] text-[#FFE3DE]">
        Pick your dishes, set how often — delivered to your door, every day.
      </p>
      <div className="relative z-[1] inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2">
        <span className="text-[12.5px] font-bold text-accent">See meal plans</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--color-accent))" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </div>
    </Link>
  );
}

function EmptyNote({ text }: { text: string }) {
  return <p className="mb-6 mt-2 text-sm text-muted">{text}</p>;
}

function relativeDate(iso: string): string {
  const date = new Date(iso);
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  const time = date.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit" });
  if (days <= 0) return `Today, ${time}`;
  if (days === 1) return `Yesterday, ${time}`;
  if (days < 7) return `${days} days ago, ${time}`;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
