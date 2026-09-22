import { createPublicClient } from "@29foods/supabase-client";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { stockCountFromEmbed } from "@29foods/core";
import { MenuGrid, type MenuItemWithStock } from "@/components/MenuGrid";
import { QrAttributionCapture } from "@/components/QrAttributionCapture";
import { BottomNav } from "@/components/shop/BottomNav";
import { ThemeToggle } from "@/components/shop/ThemeToggle";
import { InstallPrompt } from "@/components/shop/InstallPrompt";
import { UsualCard } from "@/components/UsualCard";
import { BESTSELLER_NAME } from "@/lib/menu-images";
import Image from "next/image";
import Link from "next/link";
import logo from "@/public/images/brand/logo.png";
import partyJollof from "@/public/images/menu/party-jollof.jpg";

// ISR: cached for fast navigation, refreshed at most every 20s in the background.
// Order placement and admin edits both call revalidatePath("/") for near-immediate
// correctness on the events that actually change stock — this window is just a safety net.
export const revalidate = 20;

export default async function HomePage({ searchParams }: { searchParams: Promise<{ src?: string }> }) {
  const { src } = await searchParams;
  const supabase = createPublicClient();

  const [{ data: items, error }, profile] = await Promise.all([
    supabase
      .from("menu_items")
      .select("id, name, category, price, is_available, image_url, inventory(stock_count)")
      .order("category"),
    getViewerProfile(),
  ]);

  if (error) throw error;

  const menu: MenuItemWithStock[] = (items ?? []).map((item) => ({
    id: item.id,
    name: item.name,
    category: item.category,
    price: item.price,
    imageUrl: item.image_url,
    stockCount: stockCountFromEmbed(item.inventory),
    isAvailable: item.is_available,
  }));

  const bestseller = menu.find((m) => m.name === BESTSELLER_NAME) ?? menu[0];

  return (
    <>
      {src && <QrAttributionCapture qrCode={src} />}

      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pb-3 pt-[18px]">
        <div className="flex items-center gap-2.5">
          <Image src={logo} alt="29Foods logo" width={40} height={40} className="h-10 w-10 object-contain" />
          <div className="flex flex-col leading-[1.1]">
            <span className="text-[17px] font-extrabold text-heading">29Foods</span>
            <span className="text-[11px] font-semibold tracking-[0.02em] text-accent">
              {profile ? `${profile.lodge}${profile.room ? ` · Rm ${profile.room}` : ""}` : "Set your delivery spot"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            aria-label="Notifications"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card"
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--color-heading))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-5 pb-4 pt-1">
        <div className="flex items-center gap-2.5 rounded-[14px] border border-border bg-card px-4 py-3">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--color-muted))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <span className="text-sm text-muted">Craving jollof, chicken, drinks?</span>
        </div>
      </div>

      <InstallPrompt />

      {/* Scrollable content */}
      <div className="scrollbar-none flex-grow overflow-y-auto pb-[118px]">
        {/* Hero banner */}
        <Link
          href={`/item/${bestseller?.id ?? ""}`}
          className="relative mx-5 mb-5 flex items-center gap-4 overflow-hidden rounded-hero p-[22px]"
          style={{ background: "linear-gradient(135deg, rgb(var(--color-accent)) 0%, var(--hero-gradient-end)  100%)" }}
        >
          <div className="absolute -right-5 -top-5 h-[120px] w-[120px] rounded-full bg-white/[0.08]" />
          <div className="z-[1] flex-grow">
            <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#FFD9A0]">Today&rsquo;s steeze</div>
            <h2 className="mb-2 text-[21px] font-extrabold leading-[1.15] text-white">
              Jollof + Chicken
              <br />
              from ₦2,900
            </h2>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2">
              <span className="text-[13px] font-bold text-accent">Order now</span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--color-accent))" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </div>
          </div>
          <Image
            src={partyJollof}
            alt="Party jollof rice"
            width={88}
            height={88}
            className="z-[1] h-[88px] w-[88px] shrink-0 rounded-2xl object-cover shadow-[0_6px_16px_rgba(0,0,0,0.25)] dark:shadow-[0_6px_16px_rgba(0,0,0,0.5)]"
          />
        </Link>

        {/* Delivery promise strip */}
        <div className="mx-5 mb-6 flex items-center gap-2.5 rounded-[14px] px-4 py-3" style={{ background: "var(--promise-bg)", border: "var(--promise-border)" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--promise-fg)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 3" />
          </svg>
          <span className="text-[12.5px] font-semibold" style={{ color: "var(--promise-fg)" }}>
            30 minutes or less, straight to your room
          </span>
        </div>

        <UsualCard viewerId={profile?.id ?? null} />

        {/* Category chips + menu grid */}
        <MenuGrid items={menu} />

        {/* Multi-basket nudge */}
        <div className="mx-5 mt-[22px] flex items-center gap-2.5 rounded-2xl bg-heading px-4 py-3.5 dark:border dark:border-border dark:bg-card">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFB25C" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <path d="M4 8h16l-1.5 12.5a2 2 0 0 1-2 1.5H7.5a2 2 0 0 1-2-1.5L4 8Z" />
            <path d="M8 8V6a4 4 0 0 1 8 0v2" />
          </svg>
          <span className="text-[12.5px] font-semibold text-bg dark:text-body">
            Ordering for the room too? <strong className="text-[#FFB25C]">Start a second basket</strong> at checkout
          </span>
        </div>
      </div>

      <BottomNav />
    </>
  );
}

async function getViewerProfile(): Promise<{ id: string; lodge: string; room: string | null } | null> {
  const supabase = await getSupabaseServerClient();
  // getSession() reads the already-validated cookie locally (middleware just refreshed
  // it) instead of re-verifying with the Auth server — fine for display personalization;
  // anything that writes data re-verifies with getUser() at the point of mutation.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) return null;

  const { data } = await supabase.from("users").select("id, lodge, room").eq("auth_uid", user.id).maybeSingle();
  if (!data || !data.lodge) return null;
  return { id: data.id, lodge: data.lodge, room: data.room };
}
