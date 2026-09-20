import { createServerClient, type CookieMethodsServer } from "@supabase/ssr";
import type { Database } from "./types.generated";

/**
 * Cookie-bound (anon-key, RLS-scoped) server client for reading the current
 * request's logged-in session — e.g. in a Server Component or Route Handler
 * deciding "who is this" or gating /admin. Framework-agnostic: apps/web wires
 * the cookie adapter from next/headers' cookies() at the call site so this
 * package has no Next.js dependency.
 */
export function createServerSessionClient(cookies: CookieMethodsServer) {
  return createServerClient<Database>(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    { cookies },
  );
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}
