import { createBrowserSupabaseClient } from "@29foods/supabase-client";

/** Anon-key, RLS-scoped client for Client Components. */
export function getSupabaseBrowserClient() {
  return createBrowserSupabaseClient();
}
