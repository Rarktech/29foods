"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  PLAN_DURATIONS,
  PLAN_DISH_CATALOG,
  PLAN_SLOT_ADDONS,
  MAX_FREQUENCY_PER_SLOT,
  computeSubscriptionPricing,
  type PlanDuration,
  type MealTime,
  type PlanSlotInput,
} from "@29foods/core";
import { formatKobo } from "@/lib/format";
import { getMenuImage } from "@/lib/menu-images";

interface SlotState {
  enabled: boolean;
  addonEnabled: boolean;
  freq: Record<string, number>;
}

const SLOT_ORDER: MealTime[] = ["breakfast", "lunch", "dinner"];

function tomorrowLabel(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `Tomorrow, ${d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}`;
}

export function PlanSetupForm({
  duration: initialDuration,
  isLoggedIn,
  defaultLocation,
}: {
  duration: PlanDuration;
  isLoggedIn: boolean;
  defaultLocation: { lodge: string; room: string | null; label: string } | null;
}) {
  const router = useRouter();
  const [duration, setDuration] = useState(initialDuration);
  const [slots, setSlots] = useState<Record<MealTime, SlotState>>({
    breakfast: { enabled: false, addonEnabled: false, freq: {} },
    lunch: { enabled: false, addonEnabled: false, freq: {} },
    dinner: { enabled: true, addonEnabled: false, freq: { party_jollof_chicken: 7 } },
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const slotInputs: PlanSlotInput[] = useMemo(
    () =>
      SLOT_ORDER.map((mealTime) => ({
        mealTime,
        enabled: slots[mealTime].enabled,
        addonEnabled: slots[mealTime].addonEnabled,
        dishes: Object.entries(slots[mealTime].freq)
          .filter(([, freq]) => freq > 0)
          .map(([dishKey, frequencyPerWeek]) => ({ dishKey, frequencyPerWeek })),
      })),
    [slots],
  );

  const pricing = useMemo(() => computeSubscriptionPricing(slotInputs, duration.numWeeks), [slotInputs, duration.numWeeks]);

  function toggleSlot(mealTime: MealTime) {
    setSlots((prev) => {
      const slot = prev[mealTime];
      const willEnable = !slot.enabled;
      const hasDishes = Object.values(slot.freq).some((f) => f > 0);
      const firstDish = PLAN_DISH_CATALOG[mealTime][0];
      const freq = willEnable && !hasDishes && firstDish ? { [firstDish.key]: MAX_FREQUENCY_PER_SLOT } : slot.freq;
      return { ...prev, [mealTime]: { ...slot, enabled: willEnable, freq } };
    });
  }

  function slotTotal(mealTime: MealTime): number {
    return Object.values(slots[mealTime].freq).reduce((sum, f) => sum + f, 0);
  }

  function adjustDish(mealTime: MealTime, dishKey: string, delta: number) {
    setSlots((prev) => {
      const slot = prev[mealTime];
      const current = slot.freq[dishKey] ?? 0;
      const total = Object.values(slot.freq).reduce((sum, f) => sum + f, 0);
      if (delta > 0 && total >= MAX_FREQUENCY_PER_SLOT) return prev;
      const next = Math.max(0, current + delta);
      return { ...prev, [mealTime]: { ...slot, freq: { ...slot.freq, [dishKey]: next } } };
    });
  }

  function toggleAddon(mealTime: MealTime) {
    setSlots((prev) => ({ ...prev, [mealTime]: { ...prev[mealTime], addonEnabled: !prev[mealTime].addonEnabled } }));
  }

  async function handleStart() {
    if (!pricing.hasAnyMeal) return;
    if (!isLoggedIn) {
      router.push(`/login?next=/plans/${duration.id}/setup`);
      return;
    }
    if (!defaultLocation) {
      setError("Add a delivery location on the Cart screen first, then come back.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          durationId: duration.id,
          lodge: defaultLocation.lodge,
          room: defaultLocation.room,
          slots: slotInputs,
        }),
      });
      const body = (await response.json()) as { error?: string; paymentLink?: string };
      if (!response.ok || !body.paymentLink) throw new Error(body.error ?? "Something went wrong. Please try again.");
      window.location.href = body.paymentLink;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="flex items-center gap-3.5 px-5 pb-3.5 pt-[18px]">
        <button
          aria-label="Back"
          onClick={() => router.back()}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-card"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--color-heading))" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-[18px] font-extrabold text-heading">Build your plan</h1>
      </div>

      <div className="scrollbar-none flex-grow overflow-y-auto pb-[220px]">
        <div className="px-5 pt-1">
          <h3 className="mb-2.5 text-[14.5px] font-bold text-heading">Plan length</h3>
          <div className="mb-6 flex gap-2">
            {PLAN_DURATIONS.map((d) => {
              const active = d.id === duration.id;
              return (
                <button
                  key={d.id}
                  onClick={() => setDuration(d)}
                  className="flex-1 rounded-2xl px-2 py-3 text-center"
                  style={{
                    border: active ? "1.5px solid rgb(var(--color-accent))" : "1px solid rgb(var(--color-border))",
                    background: active ? "rgb(var(--color-accent-tint))" : "rgb(var(--color-card))",
                  }}
                >
                  <div className={`mb-0.5 text-[13px] font-extrabold ${active ? "text-accent" : "text-heading"}`}>{d.label}</div>
                  <div className="text-[10.5px] font-semibold text-muted">{d.numWeeks} wk{d.numWeeks > 1 ? "s" : ""}</div>
                </button>
              );
            })}
          </div>

          <h3 className="mb-1 text-[14.5px] font-bold text-heading">When do you want meals delivered?</h3>
          <p className="mb-3 text-xs text-muted">Turn on a time, then pick exactly what you want and how often.</p>

          {SLOT_ORDER.map((mealTime) => (
            <SlotEditor
              key={mealTime}
              mealTime={mealTime}
              slot={slots[mealTime]}
              total={slotTotal(mealTime)}
              onToggle={() => toggleSlot(mealTime)}
              onAdjust={(dishKey, delta) => adjustDish(mealTime, dishKey, delta)}
              onToggleAddon={() => toggleAddon(mealTime)}
            />
          ))}

          <p className="mb-[22px] mt-1 text-[11px] text-muted">
            Each meal time can hold up to 7 deliveries a week — split however you like between the dishes on offer.
          </p>

          <h3 className="mb-2.5 text-[14.5px] font-bold text-heading">Start date</h3>
          <div className="mb-[22px] flex items-center gap-3 rounded-[14px] border border-border bg-card px-4 py-3.5">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--color-accent))" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
              <rect x="3" y="5" width="18" height="16" rx="2" />
              <path d="M16 3v4M8 3v4M3 10h18" />
            </svg>
            <span className="flex-grow text-[13.5px] font-bold text-heading">{tomorrowLabel()}</span>
          </div>

          <h3 className="mb-2.5 text-[14.5px] font-bold text-heading">Deliver to</h3>
          {defaultLocation ? (
            <div className="mb-2 flex items-center gap-3 rounded-[14px] border-[1.5px] border-accent bg-accent-tint px-4 py-3.5">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--color-accent))" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <div className="flex-grow">
                <div className="flex items-center gap-1.5">
                  <span className="text-[13px] font-bold text-heading">
                    {defaultLocation.lodge}
                    {defaultLocation.room ? `, ${defaultLocation.room}` : ""}
                  </span>
                  <span className="rounded-full bg-accent px-1.5 py-0.5 text-[8.5px] font-extrabold text-white">
                    {defaultLocation.label.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <p className="mb-2 rounded-[14px] border border-dashed border-[#D8CBB9] px-4 py-3.5 text-xs text-muted dark:border-[#3A3A3A]">
              {isLoggedIn ? "Add a delivery location from the Cart screen, then come back here." : "Sign in to set a delivery location."}
            </p>
          )}

          <p className="mt-2 text-[11.5px] leading-[1.5] text-muted">
            Have an allergy or want to change your mix later? You can update this anytime from your subscription page.
          </p>
        </div>
      </div>

      {/* Sticky summary + CTA */}
      <div
        className="absolute bottom-[18px] left-4 right-4 rounded-panel p-4"
        style={{
          background: "var(--nav-bg)",
          backdropFilter: "blur(18px) saturate(1.6)",
          WebkitBackdropFilter: "blur(18px) saturate(1.6)",
          border: "1px solid var(--nav-border)",
          boxShadow: "var(--nav-shadow)",
        }}
      >
        <div className="mb-3.5 flex flex-col gap-1 text-xs text-muted">
          <div className="flex justify-between">
            <span>Weekly food</span>
            <span>{pricing.hasAnyMeal ? formatKobo(pricing.weeklyFood) : "—"}</span>
          </div>
          <div className="flex justify-between">
            <span>Delivery · {pricing.deliveries} drop{pricing.deliveries === 1 ? "" : "s"}</span>
            <span>{pricing.hasAnyMeal ? formatKobo(pricing.deliveryTotal) : "—"}</span>
          </div>
          <div className="my-1 h-px bg-border" />
          <div className="flex justify-between text-[15px] font-extrabold text-heading">
            <span>Total · {duration.label}</span>
            <span>{pricing.hasAnyMeal ? formatKobo(pricing.grandTotal) : "—"}</span>
          </div>
        </div>
        {error && <p className="mb-2 text-[12px] font-semibold text-accent">{error}</p>}
        <button
          onClick={handleStart}
          disabled={!pricing.hasAnyMeal || submitting}
          className="flex w-full items-center justify-center rounded-2xl px-5 py-4 disabled:opacity-70"
          style={{ background: pricing.hasAnyMeal ? "rgb(var(--color-accent))" : "#D8CBB9" }}
        >
          <span className="text-[14.5px] font-bold text-white">
            {submitting ? "Redirecting to payment…" : pricing.hasAnyMeal ? "Start my plan" : "Choose at least one meal"}
          </span>
        </button>
      </div>
    </>
  );
}

function SlotEditor({
  mealTime,
  slot,
  total,
  onToggle,
  onAdjust,
  onToggleAddon,
}: {
  mealTime: MealTime;
  slot: SlotState;
  total: number;
  onToggle: () => void;
  onAdjust: (dishKey: string, delta: number) => void;
  onToggleAddon: () => void;
}) {
  const title = mealTime === "breakfast" ? "Breakfast" : mealTime === "lunch" ? "Lunch" : "Dinner";
  const sub = slot.enabled ? (total > 0 ? `${total}× a week` : "Pick your dishes below") : "Tap to turn on";
  const addon = PLAN_SLOT_ADDONS[mealTime];

  return (
    <>
      <button
        onClick={onToggle}
        className="mb-3.5 flex w-full items-center gap-3 rounded-[14px] px-3.5 py-3.5 text-left"
        style={{
          border: slot.enabled ? "1.5px solid rgb(var(--color-accent))" : "1px solid rgb(var(--color-border))",
          background: slot.enabled ? "rgb(var(--color-accent-tint))" : "rgb(var(--color-card))",
        }}
      >
        <div
          className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px]"
          style={{ background: slot.enabled ? "rgb(var(--color-accent))" : "#F3E8DA" }}
        >
          <SlotIcon mealTime={mealTime} color={slot.enabled ? "#FFFFFF" : "#8A7D6E"} />
        </div>
        <div className="flex-grow">
          <div className="text-[13.5px] font-bold text-heading">{title}</div>
          <div className="text-[11.5px] text-muted">{sub}</div>
        </div>
        <div
          className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full"
          style={{
            border: `2px solid ${slot.enabled ? "rgb(var(--color-accent))" : "#D8CBB9"}`,
            background: slot.enabled ? "rgb(var(--color-accent))" : "transparent",
          }}
        >
          {slot.enabled && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          )}
        </div>
      </button>

      {slot.enabled && (
        <div className="mb-3.5 rounded-[14px] border border-border bg-card p-3">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-[11.5px] font-bold text-heading">Pick dishes &amp; how often</span>
            <span className="text-[10.5px] font-bold" style={{ color: total >= MAX_FREQUENCY_PER_SLOT ? "rgb(var(--color-accent))" : "rgb(var(--color-muted))" }}>
              {total}/7 a week
            </span>
          </div>
          <div className="mb-2.5 flex flex-col gap-2">
            {PLAN_DISH_CATALOG[mealTime].map((dish) => {
              const count = slot.freq[dish.key] ?? 0;
              const active = count > 0;
              const img = dish.imageName ? getMenuImage(dish.imageName) : null;
              const atCap = total >= MAX_FREQUENCY_PER_SLOT;
              return (
                <div
                  key={dish.key}
                  className="flex items-center gap-2.5 rounded-xl px-2.5 py-2.5"
                  style={{
                    background: active ? "rgb(var(--color-accent-tint))" : "rgb(var(--color-bg))",
                    border: active ? "1px solid rgb(var(--color-accent))" : "1px solid rgb(var(--color-border))",
                  }}
                >
                  {img ? (
                    <Image src={img} alt={dish.name} width={32} height={32} className="h-8 w-8 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F3E8DA] dark:bg-[#262626]">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--color-muted))" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 11h18v2a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4v-2Z" />
                        <path d="M5 11V9a7 7 0 0 1 14 0v2" />
                        <path d="M2 21h20" />
                      </svg>
                    </div>
                  )}
                  <div className="flex-grow">
                    <div className="text-[12.5px] font-bold text-heading">{dish.name}</div>
                    <div className="text-[10.5px] text-muted">
                      {formatKobo(dish.priceKobo)} · {count > 0 ? `${count}× a week` : "not selected"}
                    </div>
                  </div>
                  <button
                    aria-label="Fewer"
                    onClick={() => onAdjust(dish.key, -1)}
                    className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full border border-border bg-bg text-[15px] font-bold text-heading"
                  >
                    −
                  </button>
                  <span className="w-4 text-center text-[13px] font-extrabold text-heading">{count}</span>
                  <button
                    aria-label="More"
                    onClick={() => onAdjust(dish.key, 1)}
                    disabled={atCap}
                    className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full border-none text-[15px] font-bold text-white disabled:cursor-not-allowed"
                    style={{ background: atCap ? "#D8CBB9" : "rgb(var(--color-accent))" }}
                  >
                    +
                  </button>
                </div>
              );
            })}
          </div>
          <button
            onClick={onToggleAddon}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5"
            style={{
              background: slot.addonEnabled ? "rgb(var(--color-accent-tint))" : "rgb(var(--color-bg))",
              border: `1px solid ${slot.addonEnabled ? "rgb(var(--color-accent))" : "rgb(var(--color-border))"}`,
            }}
          >
            <span
              className="flex h-3.5 w-3.5 items-center justify-center rounded"
              style={{
                border: `1.5px solid ${slot.addonEnabled ? "rgb(var(--color-accent))" : "#D8CBB9"}`,
                background: slot.addonEnabled ? "rgb(var(--color-accent))" : "transparent",
              }}
            >
              {slot.addonEnabled && (
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              )}
            </span>
            <span className="text-[11px] font-bold" style={{ color: slot.addonEnabled ? "rgb(var(--color-accent))" : "rgb(var(--color-body))" }}>
              Add {addon.label.toLowerCase()} · +{formatKobo(addon.priceKobo)}/delivery
            </span>
          </button>
        </div>
      )}
    </>
  );
}

function SlotIcon({ mealTime, color }: { mealTime: MealTime; color: string }) {
  if (mealTime === "breakfast") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="14" r="7" />
        <path d="M12 3v2" />
        <path d="M5.6 5.6l1.4 1.4" />
        <path d="M18.4 5.6l-1.4 1.4" />
      </svg>
    );
  }
  if (mealTime === "lunch") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v4l2.5 2.5" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}
