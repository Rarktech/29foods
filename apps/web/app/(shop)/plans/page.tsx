import Link from "next/link";
import { PLAN_DURATIONS } from "@29foods/core";

const BLURBS: Record<string, string> = {
  "1_week": "Perfect for a single exam or CA week — 7 days, cancel anytime.",
  "2_weeks": "Covers a full exam series — better value than going week to week.",
  "1_month": "For the full semester exam stretch. Our lowest overall rate.",
};

export default function PlansPage() {
  return (
    <>
      <div className="flex items-center gap-3.5 px-5 pb-3.5 pt-[18px]">
        <Link
          href="/account"
          aria-label="Back"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-card"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--color-heading))" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-[18px] font-extrabold text-heading">Daily Meal Plan</h1>
      </div>

      <div className="scrollbar-none flex-grow overflow-y-auto pb-6">
        <div className="px-5 pt-1">
          <div
            className="relative mb-5 overflow-hidden rounded-hero p-5"
            style={{ background: "linear-gradient(135deg, rgb(var(--color-accent)) 0%, var(--hero-gradient-end) 100%)" }}
          >
            <div className="absolute -right-5 -top-5 h-[120px] w-[120px] rounded-full bg-white/[0.08]" />
            <div className="relative z-[1] mb-2 flex items-center gap-[7px]">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#FFD9A0" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
              </svg>
              <span className="text-[11px] font-extrabold uppercase tracking-[0.06em] text-[#FFD9A0]">Built for busy days</span>
            </div>
            <h2 className="relative z-[1] mb-2 text-[19px] font-extrabold leading-[1.25] text-white">
              One less thing to think about, every day
            </h2>
            <p className="relative z-[1] text-[12.5px] leading-[1.5] text-[#FFE3DE]">
              Pick your meal times, choose your dishes, set how often — we cook and deliver on schedule, so you can focus on what matters most.
            </p>
          </div>

          <h3 className="mb-3 text-[15px] font-bold text-heading">Choose your plan length</h3>
          <div className="mb-6 flex flex-col gap-2.5">
            {PLAN_DURATIONS.map((duration, i) => (
              <Link
                key={duration.id}
                href={`/plans/${duration.id}/setup`}
                className="plan-card block rounded-2xl p-4"
                style={{
                  border: i === 0 ? "1.5px solid rgb(var(--color-accent))" : "1px solid rgb(var(--color-border))",
                  background: i === 0 ? "rgb(var(--color-accent-tint))" : "rgb(var(--color-card))",
                }}
              >
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-[14.5px] font-extrabold text-heading">{duration.label}</span>
                  {duration.badge && (
                    <span
                      className="rounded-full px-2 py-[3px] text-[9px] font-extrabold"
                      style={{
                        background: i === 0 ? "rgb(var(--color-accent))" : "var(--promise-bg)",
                        color: i === 0 ? "#FFFFFF" : "var(--promise-fg)",
                      }}
                    >
                      {duration.badge}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted">{BLURBS[duration.id]}</p>
              </Link>
            ))}
          </div>

          <h3 className="mb-3 text-[15px] font-bold text-heading">How it works</h3>
          <div className="mb-6 flex flex-col gap-3">
            {[
              ["Pick your meal times", "Breakfast, lunch and/or dinner — you choose which slots you need."],
              ["Pick your dishes & how often", "Choose from the menu for each meal time and set exactly how many times a week you want it."],
              ["It shows up on time, daily", "Delivered straight to your room at the times you set. Pause anytime."],
            ].map(([title, body], i) => (
              <div key={title} className="flex items-start gap-3">
                <div className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-heading text-xs font-extrabold text-bg">
                  {i + 1}
                </div>
                <div className="pt-0.5">
                  <div className="text-[13px] font-bold text-heading">{title}</div>
                  <div className="text-xs text-muted">{body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
