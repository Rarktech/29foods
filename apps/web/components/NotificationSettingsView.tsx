"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { NotificationPrefs } from "@29foods/supabase-client";
import { enablePush, disablePush, isPushSupported } from "@/lib/push-client";

interface RowDef {
  key?: keyof NotificationPrefs; // absent only for the always-on "Order progress" row — it isn't a real toggle
  title: string;
  note: string;
  primary?: boolean;
  always?: boolean;
  last?: boolean;
}
interface GroupDef {
  label: string;
  rows: RowDef[];
}

const GROUPS: GroupDef[] = [
  {
    label: "Order updates",
    rows: [
      { always: true, title: "Order progress", note: "Preparing, rider assigned, on the way, delivered." },
      { key: "riderMsg", title: "Rider messages", note: "When your rider calls or texts about the drop-off." },
      { key: "delivered", title: "Rate your order", note: "A single nudge after the plate lands. Never more than one.", last: true },
    ],
  },
  {
    label: "Offers & deals",
    rows: [
      { key: "flash", title: "Flash deals", note: "Short-window price drops. A few times a week at most." },
      { key: "menuDrop", title: "Daily menu drops", note: "What the kitchen is cooking tonight, around 4:00pm.", last: true },
    ],
  },
  {
    label: "Meal plan",
    rows: [
      { key: "planRenew", title: "Renewal reminders", note: "Three days before your plan renews, so you can change it." },
      { key: "planTomorrow", title: "Tomorrow’s meal", note: "The evening before, in case you want to swap the dish.", last: true },
    ],
  },
  {
    label: "Reminders",
    rows: [
      { key: "cartNudge", title: "Cart reminders", note: "If something sits in your cart for an hour." },
      { key: "winback", title: "We miss you", note: "Once a week at most, and only after a quiet stretch.", last: true },
    ],
  },
  {
    label: "Loyalty & referrals",
    rows: [
      { key: "points", title: "Points & rewards", note: "Points earned and rewards you have unlocked." },
      { key: "referral", title: "Referral bonuses", note: "When a friend orders with your code and credit lands.", last: true },
    ],
  },
  {
    label: "How we reach you",
    rows: [
      { key: "push", primary: true, title: "Push", note: "Lock-screen and in-app alerts on this phone." },
      { key: "sms", title: "SMS", note: "Fallback when you are offline. Order updates only.", last: true },
    ],
  },
];

function Toggle({ on, onClick, dimmed }: { on: boolean; onClick?: () => void; dimmed?: boolean }) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      onClick={onClick}
      aria-label="Toggle"
      className={`relative mt-0.5 h-6 w-10 shrink-0 rounded-full border-none p-0 ${on ? "bg-success" : "bg-[#D8CBB9] dark:bg-[#4A453D]"} ${dimmed ? "opacity-55" : ""}`}
    >
      <span
        className="absolute left-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.25)] transition-transform"
        style={{ transform: on ? "translateX(16px)" : "translateX(0)" }}
      >
        {dimmed && on && (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--color-success))" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
        )}
      </span>
    </Comp>
  );
}

export function NotificationSettingsView({ initialPrefs }: { initialPrefs: NotificationPrefs }) {
  const [prefs, setPrefs] = useState(initialPrefs);
  const [pushError, setPushError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function save(patch: Partial<NotificationPrefs>) {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    startTransition(() => {
      fetch("/api/push/preferences", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) }).catch(() => {});
    });
  }

  async function togglePush() {
    setPushError(null);
    if (prefs.push) {
      await disablePush().catch(() => {});
      save({ push: false });
      return;
    }
    if (!isPushSupported()) {
      setPushError("Push isn’t supported in this browser. Try adding 29Foods to your home screen first.");
      return;
    }
    try {
      await enablePush();
      save({ push: true });
    } catch {
      setPushError("We couldn’t turn on push — check your browser’s notification permission for 29Foods.");
    }
  }

  function toggleKey(key: keyof NotificationPrefs) {
    if (key === "push") {
      togglePush();
      return;
    }
    save({ [key]: !prefs[key] } as Partial<NotificationPrefs>);
  }

  return (
    <div className="flex h-screen flex-col bg-bg">
      <div className="flex shrink-0 items-center gap-3 border-b border-[#F3E8DA] px-[18px] py-4 pb-3 dark:border-border">
        <Link href="/account" aria-label="Back" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-card">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--color-heading))" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </Link>
        <h1 className="flex-grow text-[18px] font-extrabold text-heading">Notifications</h1>
      </div>

      <div className="scrollbar-none flex-grow overflow-y-auto px-[18px] pb-[34px] pt-3.5">
        <div className="mb-5 flex items-start gap-2.5 rounded-2xl bg-[#F1E8DC] px-3.5 py-3 dark:bg-[#1F1F1F]">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--color-accent))" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="mt-px shrink-0"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
          <span className="text-[12px] leading-[1.45] text-body">While an order is live you always get progress updates — that one stays on so you know where your food is.</span>
        </div>

        {pushError && (
          <div className="mb-5 rounded-2xl border border-[#F5D6D2] bg-accent-tint px-3.5 py-3 text-[12px] leading-[1.45] text-accent dark:border-[#3A1F1A]">
            {pushError}
          </div>
        )}

        {GROUPS.map((g) => (
          <div key={g.label} className="mb-5">
            <p className="mb-2.5 text-[10.5px] font-extrabold uppercase tracking-[0.09em] text-muted">{g.label}</p>
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              {g.rows.map((r, i) => {
                const on = r.key ? !!prefs[r.key] : false;
                const key = r.key;
                return (
                  <div key={r.title} className={`flex items-start gap-3 px-3.5 py-3.5 ${i < g.rows.length - 1 && !r.last ? "border-b border-[#F3E8DA] dark:border-border" : ""}`}>
                    <div className="min-w-0 flex-grow">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[13.5px] font-bold text-heading">{r.title}</span>
                        {r.primary && <span className="rounded-full bg-success-bg px-[7px] py-0.5 text-[8.5px] font-extrabold tracking-[0.05em] text-success">PRIMARY</span>}
                        {r.always && <span className="rounded-full bg-accent-tint px-[7px] py-0.5 text-[8.5px] font-extrabold tracking-[0.05em] text-accent">ALWAYS ON</span>}
                      </div>
                      <p className="mt-[3px] text-[11.5px] leading-[1.4] text-muted">{r.note}</p>
                    </div>
                    <Toggle on={r.always ? true : on} onClick={r.always || !key ? undefined : () => toggleKey(key)} dimmed={r.always} />
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <p className="mb-2.5 text-[10.5px] font-extrabold uppercase tracking-[0.09em] text-muted">Quiet hours</p>
        <div className="mb-5 overflow-hidden rounded-2xl border border-border bg-card">
          <div className="flex items-start gap-3 border-b border-[#F3E8DA] px-3.5 py-3.5 dark:border-border">
            <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-[#F1E8DC] dark:bg-[#1F1F1F]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--color-body))" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M20.5 15.2A8.5 8.5 0 0 1 8.8 3.5a8.5 8.5 0 1 0 11.7 11.7Z" /></svg>
            </div>
            <div className="min-w-0 flex-grow">
              <p className="text-[13.5px] font-bold text-heading">Quiet hours</p>
              <p className="mt-[3px] text-[11.5px] leading-[1.4] text-muted">Nothing but live order progress gets through overnight.</p>
            </div>
            <Toggle on={prefs.quiet} onClick={() => toggleKey("quiet")} />
          </div>
          <div className={`flex items-center gap-2.5 px-3.5 py-3.5 ${prefs.quiet ? "" : "opacity-45"}`}>
            <span className="flex-grow text-[12.5px] font-semibold text-body">From</span>
            <span className="rounded-[10px] bg-[#F1E8DC] px-3 py-[7px] text-[12.5px] font-extrabold text-heading dark:bg-[#1F1F1F]">{prefs.quietFrom.length === 5 ? formatHour(prefs.quietFrom) : prefs.quietFrom}</span>
            <span className="text-[12.5px] text-muted">to</span>
            <span className="rounded-[10px] bg-[#F1E8DC] px-3 py-[7px] text-[12.5px] font-extrabold text-heading dark:bg-[#1F1F1F]">{prefs.quietTo.length === 5 ? formatHour(prefs.quietTo) : prefs.quietTo}</span>
          </div>
        </div>

        <p className="px-0.5 pb-1.5 text-[11.5px] leading-[1.5] text-muted">Order progress can’t be switched off while an order is live. Everything else here is yours to turn down.</p>
      </div>
    </div>
  );
}

function formatHour(hhmm: string): string {
  const [hStr, m] = hhmm.split(":");
  const h = Number(hStr);
  const period = h >= 12 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m}${period}`;
}
