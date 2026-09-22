"use client";

import { useState } from "react";

const ACTIVITY = [
  { initial: "R", staff: "Richard", action: "Sent replacement for order #29F-1038", time: "2 min ago" },
  { initial: "T", staff: "Tolu Bankole", action: "Marked order #29F-1039 ready for pickup", time: "8 min ago" },
  { initial: "S", staff: "Sadiq Musa", action: "Reassigned order #29F-1038 to a new rider", time: "14 min ago" },
  { initial: "R", staff: "Richard", action: "Changed Party Jollof price to ₦2,900", time: "41 min ago" },
  { initial: "K", staff: "Kemi Alao", action: "Responded to a customer complaint on order #29F-1027", time: "1 hour ago" },
  { initial: "T", staff: "Tolu Bankole", action: "Toggled Garlic Fried Rice unavailable", time: "2 hours ago" },
  { initial: "R", staff: "Richard", action: "Created promo code EXAMWEEK", time: "3 hours ago" },
  { initial: "S", staff: "Sadiq Musa", action: "Marked order #29F-1029 delivered", time: "4 hours ago" },
  { initial: "R", staff: "Richard", action: "Added new rider Musa Danladi", time: "Yesterday, 6:20pm" },
  { initial: "K", staff: "Kemi Alao", action: "Sent broadcast message to All customers", time: "Yesterday, 2:10pm" },
  { initial: "T", staff: "Tolu Bankole", action: "Toggled Garlic Fried Rice available again", time: "Yesterday, 11:05am" },
  { initial: "R", staff: "Richard", action: "Updated business hours for Friday", time: "2 days ago" },
] as const;

const FILTERS = ["All", "Richard", "Tolu Bankole", "Sadiq Musa", "Kemi Alao"] as const;

// Mobile-dark uses a distinct warmer palette in this reference batch; desktop
// and light mode stay on the standard admin tokens (`lg:dark:` resets them).
const CARD = "border border-border dark:border-[#3A2F26] lg:dark:border-border bg-card dark:bg-[#241D17] lg:dark:bg-card";
const HEADING = "text-heading dark:text-[#F5EDE3] lg:dark:text-heading";
const MUTED = "text-muted dark:text-[#8A7D6E] lg:dark:text-muted";
const BODY = "text-body dark:text-[#C9BCAC] lg:dark:text-body";

export default function AdminActivityPage() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");

  const filtered = ACTIVITY.filter((a) => filter === "All" || a.staff === filter);

  return (
    <div className="min-h-screen bg-bg dark:bg-[#17120E] lg:dark:bg-bg">
      <div className="sticky top-0 z-10 flex h-16 items-center border-b border-border bg-bg px-5 dark:border-[#3A2F26] dark:bg-[#17120E] lg:dark:border-border lg:dark:bg-bg lg:px-7">
        <h1 className={`text-[18px] font-extrabold ${HEADING}`}>Activity log</h1>
      </div>

      <div className="mx-auto max-w-2xl p-5 lg:max-w-none lg:p-7">
        <div className="scrollbar-none mb-3.5 flex items-center gap-1.5 overflow-x-auto pb-0.5 lg:mb-[18px] lg:gap-2">
          <span className="hidden shrink-0 pr-1 text-[12px] font-bold text-muted lg:inline">Filter by staff:</span>
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-[11.5px] font-bold ${
                filter === f ? "bg-[#F5EDE3] text-[#17120E] dark:bg-[#F5EDE3] dark:text-[#17120E] lg:bg-heading lg:text-bg lg:dark:bg-heading lg:dark:text-bg" : `${CARD} ${BODY} font-semibold`
              }`}
            >
              <span className="lg:hidden">{f === "All" ? "All" : f.split(" ")[0]}</span>
              <span className="hidden lg:inline">{f}</span>
            </button>
          ))}
        </div>

        {/* Mobile: card list */}
        <div className="flex flex-col gap-2.5 lg:hidden">
          {filtered.map((a, i) => (
            <div key={i} className={`flex items-start gap-2.5 rounded-[14px] p-3.5 ${CARD}`}>
              <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-border text-[11.5px] font-extrabold text-body dark:bg-[#3A2F26] dark:text-[#C9BCAC] lg:dark:bg-border lg:dark:text-body">
                {a.initial}
              </div>
              <div className="min-w-0 flex-1">
                <div className={`text-[12.5px] font-bold ${HEADING}`}>{a.staff}</div>
                <div className={`mt-0.5 text-[12px] leading-[1.35] ${BODY}`}>{a.action}</div>
                <div className={`mt-[3px] text-[10.5px] ${MUTED}`}>{a.time}</div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <p className={`py-6 text-center text-[12.5px] ${MUTED}`}>No activity from {filter}.</p>}
        </div>

        {/* Desktop: table */}
        <div className="hidden overflow-hidden rounded-2xl border border-border bg-card lg:block">
          <div className="grid grid-cols-[1.2fr_2.4fr_1fr] border-b border-border bg-admin-row-hover px-[18px] py-3">
            <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-muted">Staff member</span>
            <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-muted">Action</span>
            <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-muted">Time</span>
          </div>
          {filtered.map((a, i) => (
            <div key={i} className="grid grid-cols-[1.2fr_2.4fr_1fr] items-center border-b border-admin-row-border px-[18px] py-3 transition-colors hover:bg-admin-row-hover">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-border text-[11px] font-extrabold text-body">{a.initial}</div>
                <span className="text-[12.5px] font-bold text-heading">{a.staff}</span>
              </div>
              <span className="text-[12.5px] text-body">{a.action}</span>
              <span className="text-[11.5px] text-muted">{a.time}</span>
            </div>
          ))}
          {filtered.length === 0 && <p className="p-6 text-center text-[12.5px] text-muted">No activity from {filter}.</p>}
        </div>
      </div>
    </div>
  );
}
