"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { BottomNav } from "@/components/shop/BottomNav";

interface SavedLocation {
  id: string;
  label: string;
  lodge: string;
  room: string | null;
}

interface ActiveSubscription {
  id: string;
  durationLabel: string;
  startDate: string;
  endDate: string;
  deliveriesTotal: number;
  deliveriesUsed: number;
}

const LABEL_TEXT: Record<string, string> = { home: "HOME", work: "WORK", friend: "FRIEND", other: "OTHER" };

export function AccountView({
  name,
  phone,
  lodge,
  email,
  locations,
  activeSubscription,
  updateProfileAction,
}: {
  name: string;
  phone: string | null;
  lodge: string | null;
  email: string | null;
  locations: SavedLocation[];
  activeSubscription: ActiveSubscription | null;
  updateProfileAction: (formData: FormData) => Promise<void>;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const initial = (name || email || "?").trim().charAt(0).toUpperCase();

  async function logout() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const dayOfPlan =
    activeSubscription &&
    Math.min(
      Math.max(1, Math.floor((Date.now() - new Date(activeSubscription.startDate).getTime()) / 86_400_000) + 1),
      Math.floor((new Date(activeSubscription.endDate).getTime() - new Date(activeSubscription.startDate).getTime()) / 86_400_000) + 1,
    );
  const totalDays = activeSubscription
    ? Math.floor((new Date(activeSubscription.endDate).getTime() - new Date(activeSubscription.startDate).getTime()) / 86_400_000) + 1
    : 0;
  const progressPct = activeSubscription && activeSubscription.deliveriesTotal > 0
    ? Math.min(100, Math.round((activeSubscription.deliveriesUsed / activeSubscription.deliveriesTotal) * 100))
    : 0;

  return (
    <>
      <div className="scrollbar-none flex-grow overflow-y-auto pb-[118px]">
        {/* Profile header */}
        <div className="flex items-center gap-3.5 px-5 pb-5 pt-6">
          <div
            className="flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-full"
            style={{ background: "linear-gradient(135deg, rgb(var(--color-accent)) 0%, var(--hero-gradient-end) 100%)" }}
          >
            <span className="text-[22px] font-extrabold text-white">{initial}</span>
          </div>
          {editing ? (
            <form
              action={async (formData) => {
                await updateProfileAction(formData);
                setEditing(false);
              }}
              className="flex flex-grow flex-col gap-2"
            >
              <input
                name="name"
                defaultValue={name}
                placeholder="Your name"
                className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-heading"
              />
              <input
                name="phone"
                defaultValue={phone ?? ""}
                placeholder="Phone"
                type="tel"
                className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-heading"
              />
              <div className="flex gap-2">
                <button type="submit" className="rounded-full bg-accent px-4 py-1.5 text-xs font-bold text-white">
                  Save
                </button>
                <button type="button" onClick={() => setEditing(false)} className="rounded-full border border-border px-4 py-1.5 text-xs font-semibold text-body">
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className="flex-grow">
                <h1 className="mb-0.5 text-[19px] font-extrabold text-heading">{name}</h1>
                <div className="text-xs text-muted">
                  {[phone ?? "No phone yet", lodge].filter(Boolean).join(" · ")}
                </div>
              </div>
              <button
                aria-label="Edit profile"
                onClick={() => setEditing(true)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-card"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--color-heading))" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
              </button>
            </>
          )}
        </div>

        <div className="px-5">
          {activeSubscription && (
            <Link
              href={`/plans/confirmed/${activeSubscription.id}`}
              className="relative mb-5 block overflow-hidden rounded-2xl p-4"
              style={{ background: "linear-gradient(135deg, rgb(var(--color-accent)) 0%, var(--hero-gradient-end) 100%)" }}
            >
              <div className="pointer-events-none absolute -right-[18px] -top-[18px] h-[100px] w-[100px] rounded-full bg-white/[0.08]" />
              <div className="relative z-[1] mb-1.5 flex items-center justify-between">
                <div className="flex items-center gap-[7px]">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#FFD9A0" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
                  </svg>
                  <span className="text-[11px] font-extrabold uppercase tracking-[0.05em] text-[#FFD9A0]">Daily Meal Plan</span>
                </div>
                <span className="rounded-full bg-white px-2 py-[3px] text-[9.5px] font-extrabold text-accent">
                  DAY {dayOfPlan} OF {totalDays}
                </span>
              </div>
              <div className="relative z-[1] mb-2.5 text-[15px] font-bold text-white">{activeSubscription.durationLabel} plan</div>
              <div className="relative z-[1] mb-2.5 h-1.5 overflow-hidden rounded-full bg-white/25">
                <div className="h-full rounded-full bg-white" style={{ width: `${progressPct}%` }} />
              </div>
              <div className="relative z-[1] text-[11.5px] text-[#FFE3DE]">
                {activeSubscription.deliveriesUsed} of {activeSubscription.deliveriesTotal} deliveries used
              </div>
            </Link>
          )}

          <div className="mb-2.5 flex items-center justify-between">
            <h3 className="text-[14.5px] font-bold text-heading">Saved locations</h3>
            <Link href="/cart" className="text-[11.5px] font-bold text-accent">
              Manage
            </Link>
          </div>
          <div className="mb-[22px] flex flex-col gap-2">
            {locations.length === 0 && <p className="text-xs text-muted">No saved locations yet — add one from the Cart screen.</p>}
            {locations.map((loc) => (
              <div key={loc.id} className="flex items-center gap-3 rounded-[14px] border border-border bg-card px-3.5 py-3">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--color-accent))" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <div className="flex-grow">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-bold text-heading">
                      {loc.lodge}
                      {loc.room ? `, ${loc.room}` : ""}
                    </span>
                    <span className="rounded-full bg-[#F3E8DA] px-1.5 py-0.5 text-[8.5px] font-extrabold text-[#6B5C4E] dark:bg-[#262626] dark:text-muted">
                      {LABEL_TEXT[loc.label] ?? "OTHER"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mb-2.5 flex items-center justify-between">
            <h3 className="text-[14.5px] font-bold text-heading">Payment</h3>
          </div>
          <div className="mb-[22px] flex items-center gap-3 rounded-[14px] border border-border bg-card px-3.5 py-3">
            <div className="flex h-[22px] w-8 shrink-0 items-center justify-center rounded-[5px] bg-heading text-[9px] font-extrabold text-[#FFB25C]">PAY</div>
            <span className="flex-grow text-[13px] font-bold text-heading">Card or bank transfer, via Flutterwave</span>
          </div>

          <h3 className="mb-2.5 text-[14.5px] font-bold text-heading">Settings</h3>
          <div className="mb-[22px] flex flex-col overflow-hidden rounded-[14px] border border-border bg-card">
            <SettingsRow label="Notifications" icon={<BellIcon />} />
            <a href="mailto:help@29foods.app" className="block">
              <SettingsRow label="Help & support" icon={<HelpIcon />} bordered />
            </a>
            <SettingsRow label="Account settings" icon={<GearIcon />} last />
          </div>

          <button
            onClick={logout}
            className="mb-3 w-full rounded-[14px] border px-3.5 py-3.5 text-[13px] font-bold text-accent"
            style={{ background: "rgb(var(--color-accent-tint))", borderColor: "#F5D6D2" }}
          >
            Log out
          </button>
        </div>
      </div>

      <BottomNav />
    </>
  );
}

function SettingsRow({ label, icon, bordered = true, last = false }: { label: string; icon: React.ReactNode; bordered?: boolean; last?: boolean }) {
  return (
    <div
      className="flex w-full items-center gap-3 px-3.5 py-3.5 text-left"
      style={{ borderBottom: last || !bordered ? "none" : "1px solid #F3E8DA" }}
    >
      {icon}
      <span className="flex-grow text-[13.5px] font-semibold text-heading">{label}</span>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#B4A797" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18l6-6-6-6" />
      </svg>
    </div>
  );
}

function BellIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--color-body))" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}
function HelpIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--color-body))" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 17v-6" />
      <circle cx="12" cy="8" r="0.5" fill="currentColor" />
    </svg>
  );
}
function GearIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--color-body))" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
