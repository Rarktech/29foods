"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ThemeToggle } from "@/components/shop/ThemeToggle";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type TabId = "overview" | "orders" | "menu" | "customers" | "settings";

interface NavItem {
  label: string;
  icon: (color: string) => React.ReactNode;
  /** Dashboard-tab items navigate to /admin/dashboard?tab=<tabId>; everything else is a plain route. */
  tabId?: TabId;
  href?: string;
  /** Standalone detail routes (e.g. /admin/orders/[id]) that should still highlight this tabId item. */
  activePrefixes?: string[];
}

const NAV_ITEMS: NavItem[] = [
  { label: "Overview", tabId: "overview", icon: (c) => <GridIcon color={c} /> },
  { label: "Orders", tabId: "orders", icon: (c) => <BagIcon color={c} />, activePrefixes: ["/admin/orders"] },
  { label: "Kitchen", href: "/admin/kitchen", icon: (c) => <KitchenIcon color={c} /> },
  { label: "Cashier / POS", href: "/admin/cashier", icon: (c) => <CashierIcon color={c} /> },
  { label: "Daily Portions", href: "/admin/daily-portions", icon: (c) => <PortionsIcon color={c} /> },
  { label: "Riders", href: "/admin/riders", icon: (c) => <RidersIcon color={c} /> },
  { label: "Menu", tabId: "menu", icon: (c) => <MenuIcon color={c} /> },
  { label: "Inventory", href: "/admin/inventory", icon: (c) => <InventoryIcon color={c} /> },
  { label: "Recipes", href: "/admin/recipes", icon: (c) => <RecipesIcon color={c} /> },
  { label: "Meal plans", href: "/admin/meal-plans", icon: (c) => <MealPlansIcon color={c} /> },
  { label: "Customers", tabId: "customers", icon: (c) => <CustomersIcon color={c} />, activePrefixes: ["/admin/customers"] },
  { label: "Feedback", href: "/admin/feedback", icon: (c) => <FeedbackIcon color={c} /> },
  { label: "Promotions", href: "/admin/promotions", icon: (c) => <PromotionsIcon color={c} /> },
  { label: "Messages", href: "/admin/messages", icon: (c) => <MessagesIcon color={c} /> },
  { label: "Delivery zones", href: "/admin/delivery-zones", icon: (c) => <ZonesIcon color={c} /> },
  { label: "Reports", href: "/admin/reports", icon: (c) => <ReportsIcon color={c} /> },
  { label: "Activity log", href: "/admin/activity", icon: (c) => <ActivityIcon color={c} /> },
  { label: "Copilot", href: "/admin/copilot", icon: (c) => <CopilotIcon color={c} /> },
  { label: "Settings", tabId: "settings", icon: (c) => <SettingsIcon color={c} /> },
];

export function AdminShell({
  profile,
  children,
}: {
  profile: { name: string | null; email: string | null; role: string };
  children: React.ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      {/* Desktop sidebar */}
      <aside className="hidden w-[232px] shrink-0 flex-col overflow-y-auto bg-admin-sidebar dark:bg-admin-sidebar border-r border-border p-4 lg:flex">
        <SidebarContent profile={profile} />
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDrawerOpen(false)} />
          <aside className="relative flex w-[260px] flex-col overflow-y-auto bg-admin-sidebar p-4">
            <SidebarContent profile={profile} onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Mobile top bar — each desktop page owns its own top chrome (search bar, "logged in as"
            pill, etc.) to match its own reference exactly, so only mobile gets a shared bar here.
            This stays outside the scrolling `main` below, so it's always visible on mobile. */}
        <div className="flex shrink-0 items-center justify-between gap-2.5 bg-bg px-5 pb-3.5 pt-[18px] lg:hidden">
          <div className="flex items-center gap-2.5">
            <button
              aria-label="Open menu"
              onClick={() => setDrawerOpen(true)}
              className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full border border-border bg-card"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--color-heading))" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-accent text-[13px] font-extrabold text-white">29</span>
            <div className="flex flex-col leading-[1.1]">
              <span className="text-[16px] font-extrabold text-heading">Admin</span>
              <span className="text-[11px] font-semibold text-accent">29Foods · Abakaliki</span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle />
            <button aria-label="Notifications" className="relative flex h-[38px] w-[38px] items-center justify-center rounded-full border border-border bg-card">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--color-heading))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <span className="absolute right-2 top-[7px] h-[7px] w-[7px] rounded-full bg-accent ring-2 ring-card" />
            </button>
          </div>
        </div>

        {/* The single scrolling region for all page content — each page's own h-16 header
            uses `sticky top-0` to pin itself to the top of this box as its content scrolls. */}
        <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}

function SidebarContent({
  profile,
  onNavigate,
}: {
  profile: { name: string | null; email: string | null; role: string };
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get("tab") as TabId | null) ?? "overview";

  async function handleSignOut() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  const initial = (profile.name ?? profile.email ?? "A").charAt(0).toUpperCase();

  return (
    <>
      <div className="mb-6 flex items-center gap-2.5 px-2 pt-1.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-[13px] font-extrabold text-white">29</span>
        <div className="flex flex-col leading-[1.1]">
          <span className="text-[15px] font-extrabold text-heading">29Foods</span>
          <span className="text-[10.5px] font-bold text-admin-nav-active">Admin</span>
        </div>
      </div>

      <nav className="scrollbar-none flex flex-col gap-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const active = item.tabId
            ? (pathname === "/admin/dashboard" && activeTab === item.tabId) || (item.activePrefixes?.some((p) => pathname.startsWith(p)) ?? false)
            : pathname.startsWith(item.href!);
          const color = active ? "var(--admin-nav-active-text)" : "rgb(var(--color-body))";
          const content = (
            <>
              {item.icon(color)}
              <span className="text-[13px]" style={{ fontWeight: active ? 700 : 600, color }}>
                {item.label}
              </span>
            </>
          );
          const className = `flex items-center gap-[11px] rounded-[10px] px-3 py-2.5 transition-colors hover:bg-accent-tint ${
            active ? "bg-accent-tint" : ""
          }`;

          if (item.tabId) {
            return (
              <button
                key={item.label}
                onClick={() => {
                  router.push(`/admin/dashboard?tab=${item.tabId}`);
                  onNavigate?.();
                }}
                className={className}
              >
                {content}
              </button>
            );
          }
          return (
            <Link key={item.label} href={item.href!} onClick={onNavigate} className={className}>
              {content}
            </Link>
          );
        })}
      </nav>

      <div className="flex-grow" />

      <div className="flex items-center gap-2.5 border-t border-border px-2 py-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-tint text-[12px] font-extrabold text-admin-nav-active">
          {initial}
        </span>
        <div className="min-w-0 flex-1 leading-[1.2]">
          <p className="truncate text-[12.5px] font-bold text-heading">{profile.name ?? "Admin"}</p>
          <p className="truncate text-[10.5px] capitalize text-muted">{profile.role}</p>
        </div>
        <button
          aria-label="Sign out"
          onClick={handleSignOut}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border text-muted"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <path d="M16 17l5-5-5-5M21 12H9" />
          </svg>
        </button>
      </div>
    </>
  );
}

function iconProps(color: string) {
  return { width: 17, height: 17, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: 2.1, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, style: { flexShrink: 0 } };
}

function GridIcon({ color }: { color: string }) {
  return <svg {...iconProps(color)}><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></svg>;
}
function BagIcon({ color }: { color: string }) {
  return <svg {...iconProps(color)}><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>;
}
function KitchenIcon({ color }: { color: string }) {
  return <svg {...iconProps(color)}><path d="M8 3v4M16 3v4" /><rect x="3" y="7" width="18" height="14" rx="2" /><path d="M3 12h18" /></svg>;
}
function CashierIcon({ color }: { color: string }) {
  return <svg {...iconProps(color)}><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M2 11h20" /><path d="M6 15h4" /><path d="M9 3v4M15 3v4" /></svg>;
}
function PortionsIcon({ color }: { color: string }) {
  return <svg {...iconProps(color)}><path d="M4 12h16a1 1 0 0 1 1 1 8 8 0 0 1-8 8H11a8 8 0 0 1-8-8 1 1 0 0 1 1-1Z" /><path d="M8 12V7a4 4 0 0 1 8 0v5" /><path d="M12 3v1.5" /></svg>;
}
function RidersIcon({ color }: { color: string }) {
  return <svg {...iconProps(color)}><circle cx="5.5" cy="17.5" r="3.5" /><circle cx="18.5" cy="17.5" r="3.5" /><path d="M15 6a1 1 0 0 0-1-1h-4" /><path d="M12 17.5V14l-3-3 4-3 2 3h2" /></svg>;
}
function MenuIcon({ color }: { color: string }) {
  return <svg {...iconProps(color)}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" /></svg>;
}
function InventoryIcon({ color }: { color: string }) {
  return <svg {...iconProps(color)}><path d="M21 8V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2" /><path d="M3 8l2 12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2l2-12" /><path d="M3 8h18" /></svg>;
}
function RecipesIcon({ color }: { color: string }) {
  return <svg {...iconProps(color)}><path d="M6 14a4 4 0 1 1 1.6-7.7 4.5 4.5 0 0 1 8.8 0A4 4 0 1 1 18 14" /><path d="M6 14v5a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-5" /><path d="M6 17.2h12" /></svg>;
}
function MealPlansIcon({ color }: { color: string }) {
  return <svg {...iconProps(color)}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>;
}
function CustomersIcon({ color }: { color: string }) {
  return <svg {...iconProps(color)}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
}
function FeedbackIcon({ color }: { color: string }) {
  return <svg {...iconProps(color)}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>;
}
function PromotionsIcon({ color }: { color: string }) {
  return <svg {...iconProps(color)}><path d="m20.59 13.41-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82Z" /><circle cx="7.5" cy="7.5" r="1.5" /></svg>;
}
function MessagesIcon({ color }: { color: string }) {
  return <svg {...iconProps(color)}><path d="M22 12a10 10 0 0 1-14.14 9.1L2 22l1.5-5.5A10 10 0 1 1 22 12Z" /></svg>;
}
function ZonesIcon({ color }: { color: string }) {
  return <svg {...iconProps(color)}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>;
}
function ReportsIcon({ color }: { color: string }) {
  return <svg {...iconProps(color)}><path d="M3 3v18h18" /><path d="M18 17V9M13 17V5M8 17v-4" /></svg>;
}
function ActivityIcon({ color }: { color: string }) {
  return <svg {...iconProps(color)}><path d="M12 8v4l3 3" /><circle cx="12" cy="12" r="9" /></svg>;
}
function CopilotIcon({ color }: { color: string }) {
  return <svg {...iconProps(color)}><path d="M12 3v3.5M12 17.5V21M3 12h3.5M17.5 12H21M5.6 5.6l2.5 2.5M15.9 15.9l2.5 2.5M18.4 5.6l-2.5 2.5M8.1 15.9l-2.5 2.5" /><path d="M12 8.5 13 11l2.5 1-2.5 1-1 2.5-1-2.5L8.5 12l2.5-1Z" /></svg>;
}
function SettingsIcon({ color }: { color: string }) {
  return <svg {...iconProps(color)}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>;
}
