import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types.generated";

/**
 * Anon-key client with no session/cookie handling — for server-side reads of
 * public, RLS-open data only (menu_items, inventory, qr_codes). Not for
 * anything user-scoped; use createServerSessionClient for that.
 */
export function createPublicClient(): SupabaseClient<Database> {
  return createClient<Database>(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}
