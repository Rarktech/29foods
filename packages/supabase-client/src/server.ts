import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types.generated";

/**
 * Service-role client. Bypasses RLS entirely — only ever import this in
 * server-side code (Next.js route handlers/server actions, bot processes).
 * NEVER import this module from a client component or bundle it for the browser.
 */
export function createServiceClient(): SupabaseClient<Database> {
  const url = requireEnv("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL");
  const key = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  return createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function requireEnv(...names: string[]): string {
  for (const name of names) {
    const value = process.env[name];
    if (value) return value;
  }
  throw new Error(`Missing required env var: one of ${names.join(", ")}`);
}
