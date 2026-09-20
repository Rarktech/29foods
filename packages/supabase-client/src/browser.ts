import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types.generated";

/**
 * Browser (anon-key) client for client components. Scoped by RLS — this is the
 * client a logged-in customer's Google session talks through.
 */
export function createBrowserSupabaseClient() {
  return createBrowserClient<Database>(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  );
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}
