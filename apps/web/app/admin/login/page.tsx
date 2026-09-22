"use client";

import { useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

// Admin/owner login is email+password (Supabase Auth), separate from the customer Google flow —
// admin_profiles rows are provisioned manually (Supabase dashboard) for the owner/managers only.
// The Cashier tab mirrors the reference design but stays disabled until POS (Phase 2) exists.
export default function AdminLoginPage() {
  const [role, setRole] = useState<"admin" | "cashier">("admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const supabase = getSupabaseBrowserClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError("Invalid email or password.");
      setSubmitting(false);
      return;
    }
    window.location.href = "/admin/dashboard";
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-5">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent text-[15px] font-extrabold text-white">
            29
          </span>
          <h1 className="text-[19px] font-extrabold leading-[1.3] text-heading">Run 29Foods from one place</h1>
          <p className="mx-auto mt-2 max-w-[280px] text-[12.5px] leading-[1.5] text-muted">
            Orders, riders, the menu, subscriptions, and revenue — everything your team needs to keep Abakaliki fed, on time.
          </p>
        </div>

        <div className="rounded-panel border border-border bg-card p-6">
          <p className="mb-1 text-[15px] font-extrabold text-heading">Admin sign in</p>
          <p className="mb-5 text-[11.5px] text-muted">29Foods · Abakaliki operations</p>

          <div className="mb-5 flex rounded-full border border-border bg-bg p-1">
            <button
              type="button"
              onClick={() => setRole("admin")}
              className={`flex-1 rounded-full py-2 text-[12.5px] font-bold transition-colors ${
                role === "admin" ? "bg-accent text-white" : "text-muted"
              }`}
            >
              Admin
            </button>
            <button
              type="button"
              onClick={() => setRole("cashier")}
              className="flex-1 rounded-full py-2 text-[12.5px] font-bold text-muted"
              title="Cashier / POS is coming soon"
            >
              Cashier
            </button>
          </div>

          {role === "cashier" ? (
            <p className="rounded-xl2 bg-bg px-4 py-6 text-center text-[12.5px] text-muted">
              Cashier sign-in is coming soon.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
              <div>
                <label className="mb-1.5 block text-[11.5px] font-semibold text-muted">Email or staff ID</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl2 border border-border bg-bg px-4 py-3 text-[13.5px] text-body"
                  required
                />
              </div>
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-[11.5px] font-semibold text-muted">Password</label>
                  <span className="text-[11.5px] font-semibold text-accent">Forgot password?</span>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl2 border border-border bg-bg px-4 py-3 text-[13.5px] text-body"
                  required
                />
              </div>
              {error && <p className="text-[12.5px] font-semibold text-accent">{error}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="mt-1.5 rounded-full bg-accent py-3.5 text-[13.5px] font-bold text-white disabled:opacity-50"
              >
                {submitting ? "Signing in…" : "Sign in"}
              </button>
            </form>
          )}
        </div>

        <p className="mt-5 text-center text-[12px] text-muted">
          Not staff?{" "}
          <a href="/" className="font-semibold text-accent">
            Go to 29Foods
          </a>
        </p>
      </div>
    </main>
  );
}
