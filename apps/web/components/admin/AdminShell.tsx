"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/shop/ThemeToggle";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const NAV_LINKS = [
  { href: "/admin/dashboard", label: "Dashboard", icon: DashboardIcon },
  { href: "/admin/riders", label: "Riders", icon: RidersIcon },
  { href: "/admin/messages", label: "Messages", icon: MessagesIcon },
  { href: "/admin/feedback", label: "Feedback", icon: FeedbackIcon },
];

export function AdminShell({
  profile,
  children,
}: {
  profile: { name: string | null; email: string | null; role: string };
  children: React.ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-bg">
      {/* Desktop sidebar */}
      <aside className="hidden w-[260px] shrink-0 flex-col border-r border-border bg-card lg:flex">
        <SidebarContent profile={profile} pathname={pathname} />
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDrawerOpen(false)} />
          <aside className="relative flex w-[260px] flex-col border-r border-border bg-card">
            <SidebarContent profile={profile} pathname={pathname} onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-h-screen flex-1 flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3 border-b border-border bg-card px-5 py-4 lg:px-8">
          <button
            aria-label="Open menu"
            onClick={() => setDrawerOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border lg:hidden"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--color-heading))" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="text-[15px] font-extrabold text-heading lg:hidden">29Foods Admin</span>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>

        <main className="flex-1 p-5 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

function SidebarContent({
  profile,
  pathname,
  onNavigate,
}: {
  profile: { name: string | null; email: string | null; role: string };
  pathname: string;
  onNavigate?: () => void;
}) {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  const initial = (profile.name ?? profile.email ?? "A").charAt(0).toUpperCase();

  return (
    <>
      <div className="flex items-center gap-2.5 px-5 pb-2 pt-6">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-sm font-extrabold text-white">29</span>
        <span className="text-[15px] font-extrabold text-heading">29Foods Admin</span>
      </div>

      <nav className="flex flex-col gap-1 px-3 py-4">
        {NAV_LINKS.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-xl2 px-3 py-2.5 text-[14px] font-semibold transition-colors ${
                active ? "bg-accent-tint text-accent" : "text-body hover:bg-bg"
              }`}
            >
              <item.icon active={active} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex items-center gap-3 border-t border-border px-4 py-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-tint text-sm font-extrabold text-accent">
          {initial}
        </span>
        <div className="min-w-0 flex-1 leading-[1.2]">
          <p className="truncate text-[13px] font-bold text-heading">{profile.name ?? "Admin"}</p>
          <p className="truncate text-[11px] capitalize text-muted">{profile.role}</p>
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

function DashboardIcon({ active }: { active: boolean }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={active ? "rgb(var(--color-accent))" : "currentColor"} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  );
}
function RidersIcon({ active }: { active: boolean }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={active ? "rgb(var(--color-accent))" : "currentColor"} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5.5" cy="17.5" r="3.5" />
      <circle cx="18.5" cy="17.5" r="3.5" />
      <path d="M5.5 17.5 9 8h4l3 4h4.5M9 8 7 5H4" />
    </svg>
  );
}
function MessagesIcon({ active }: { active: boolean }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={active ? "rgb(var(--color-accent))" : "currentColor"} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
function FeedbackIcon({ active }: { active: boolean }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={active ? "rgb(var(--color-accent))" : "currentColor"} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3z" />
      <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
    </svg>
  );
}
