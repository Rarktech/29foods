import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types.generated";

/**
 * Browser (anon-key) client for client components. Scoped by RLS — this is the
 * client a logged-in customer's Google session talks through.
 *
 * Next.js only inlines `NEXT_PUBLIC_*` vars into the browser bundle when they're
 * accessed as a static `process.env.THE_NAME` literal — a dynamic
 * `process.env[name]` lookup (even of a NEXT_PUBLIC_ var) can't be statically
 * analyzed, so it silently resolves to `undefined` at runtime in the browser.
 * Keep these two accesses literal.
 */
export function createBrowserSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url) throw new Error("Missing required env var: NEXT_PUBLIC_SUPABASE_URL");
  if (!anonKey) throw new Error("Missing required env var: NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return createBrowserClient<Database>(url, anonKey);
}
