import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { PLAN_DURATIONS } from "@29foods/core";
import { formatKobo } from "@/lib/format";
import { getMenuImage } from "@/lib/menu-images";

const WEEKDAY_LABELS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

export default async function PlanConfirmedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await getSupabaseServerClient();

  // getSession() trusts the cookie middleware already validated — this page only
  // reads; RLS still hides subscriptions that aren't this user's regardless.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) redirect(`/login?next=/plans/confirmed/${id}`);

  const { data: subscription } = await supabase.from("subscriptions").select("*").eq("id", id).maybeSingle();
  if (!subscription) notFound();

  const { data: slots } = await supabase
    .from("subscription_slots")
    .select("id, meal_time, addon_enabled, addon_label")
    .eq("subscription_id", id);

  const { data: dishes } = await supabase
    .from("subscription_slot_dishes")
    .select("id, subscription_slot_id, dish_key, dish_name, frequency_per_week, unit_price_kobo, scheduled_weekdays")
    .in("subscription_slot_id", (slots ?? []).map((s) => s.id));

  const duration = PLAN_DURATIONS.find((d) => d.id === subscription.duration_id);
  const slotLabels = (slots ?? []).map((s) => s.meal_time.charAt(0).toUpperCase() + s.meal_time.slice(1));

  if (subscription.status === "pending_payment") {
    return (
      <div className="flex flex-grow flex-col items-center justify-center gap-2 px-8 text-center">
        <p className="text-heading">Waiting for payment confirmation…</p>
        <p className="text-sm text-muted">This updates automatically once payment clears.</p>
      </div>
    );
  }

  const scheduleEntries = (dishes ?? [])
    .flatMap((d) => d.scheduled_weekdays.map((weekday) => ({ weekday, dish: d })))
    .sort((a, b) => a.weekday - b.weekday)
    .slice(0, 7);

  const startDate = new Date(subscription.start_date);
  const endDate = new Date(subscription.end_date);
  const dateRange = `${formatDate(startDate)} → ${formatDate(endDate)}`;

  const freqSummary = (dishes ?? [])
    .map((d) => `${d.frequency_per_week}× ${d.dish_name}`)
    .join(" · ");

  return (
    <div className="scrollbar-none flex flex-grow flex-col items-center overflow-y-auto px-5 pb-6 pt-9">
      <div className="relative mb-[18px] flex h-[88px] w-[88px] shrink-0 items-center justify-center">
        <div className="check-ring absolute inset-0 rounded-full" style={{ border: "2px solid rgb(var(--color-success))" }} />
        <div
          className="check-badge flex h-[76px] w-[76px] items-center justify-center rounded-full"
          style={{ background: "linear-gradient(150deg, #2E9159 0%, #1F7A45 100%)", boxShadow: "0 10px 24px rgba(31,122,69,0.35)" }}
        >
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
      </div>

      <h1 className="mb-1.5 text-center text-[22px] font-extrabold text-heading">Your meal plan is set!</h1>
      <p className="mb-[22px] text-center text-[13px] leading-[1.5] text-muted">
        You&rsquo;re set — we&rsquo;ve got your meals handled for the next {duration?.label.toLowerCase() ?? "while"}.
      </p>

      <div className="mb-5 w-full overflow-hidden rounded-[22px] border border-border bg-card shadow-[0_10px_24px_rgba(60,40,20,0.08)]">
        <div
          className="relative overflow-hidden p-5"
          style={{ background: "linear-gradient(135deg, #C41E1E 0%, #8A1414 100%)" }}
        >
          <div className="pointer-events-none absolute -right-[30px] -top-[30px] h-[150px] w-[150px] rounded-full bg-white/[0.09]" />
          <div className="relative z-[1] mb-3 flex items-center gap-[7px]">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#FFD9A0" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
            </svg>
            <span className="text-[11px] font-extrabold uppercase tracking-[0.05em] text-[#FFD9A0]">
              Daily Meal Plan · {duration?.label}
            </span>
          </div>
          <div className="relative z-[1] mb-2.5 text-[17px] font-extrabold leading-[1.3] text-white">{slotLabels.join(" + ") || "Your plan"}</div>
          <div className="relative z-[1] mb-3.5 text-xs leading-[1.5] text-[#FFE3DE]">
            {freqSummary}, weekly
            <br />
            {dateRange} · {subscription.lodge}
            {subscription.room ? `, ${subscription.room}` : ""}
          </div>
          <div className="relative z-[1] flex items-center justify-between border-t border-white/[0.18] pt-3 text-[12.5px] font-bold text-white">
            <span>Total paid</span>
            <span className="text-[14.5px] font-extrabold">{formatKobo(subscription.total_paid)}</span>
          </div>
        </div>

        <div className="flex items-center gap-3.5 border-b border-[#F1E8DC] px-5 py-4 dark:border-[#262626]">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FFF3E9] dark:bg-[#2A1F12]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--color-warning))" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3.5 2" />
            </svg>
          </div>
          <div className="min-w-0 flex-grow">
            <div className="mb-0.5 text-[10.5px] font-bold uppercase tracking-[0.05em] text-muted">First delivery</div>
            <div className="text-[15px] font-extrabold leading-[1.3] text-heading">Tomorrow</div>
          </div>
          {scheduleEntries[0] && (
            <div className="max-w-[92px] shrink-0 text-right text-[11.5px] leading-[1.4] text-muted">{scheduleEntries[0].dish.dish_name}</div>
          )}
        </div>

        <div className="px-5 pb-[18px] pt-4">
          <h3 className="mb-3 text-[12.5px] font-bold uppercase tracking-[0.04em] text-muted">This week&rsquo;s schedule</h3>
          <div className="flex flex-col gap-3">
            {scheduleEntries.map((entry, i) => {
              const img = getMenuImage(entry.dish.dish_name);
              return (
                <div key={`${entry.dish.id}-${entry.weekday}`} className="flex items-center gap-3">
                  <span className="w-[30px] shrink-0 text-[11px] font-extrabold" style={{ color: i === 0 ? "rgb(var(--color-accent))" : "rgb(var(--color-muted))" }}>
                    {WEEKDAY_LABELS[entry.weekday]}
                  </span>
                  {img ? (
                    <Image src={img} alt={entry.dish.dish_name} width={34} height={34} className="h-[34px] w-[34px] shrink-0 rounded-lg object-cover" />
                  ) : (
                    <div className="h-[34px] w-[34px] shrink-0 rounded-lg bg-border" />
                  )}
                  <span className={`flex-grow text-[12.5px] ${i === 0 ? "font-bold text-heading" : "font-semibold text-body"}`}>{entry.dish.dish_name}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <Link
        href="/account"
        className="mb-2.5 flex w-full items-center justify-center rounded-2xl bg-accent px-5 py-4 shadow-[0_6px_16px_rgba(196,30,30,0.28)]"
      >
        <span className="text-[14.5px] font-bold text-white">Manage my plan</span>
      </Link>
      <Link href="/" className="p-2 text-[13px] font-bold text-muted">
        Back to menu
      </Link>
    </div>
  );
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}
