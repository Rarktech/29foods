import { cookies } from "next/headers";
import { createServerSessionClient } from "@29foods/supabase-client";

/** Cookie-bound, RLS-scoped client for use in Server Components, Route Handlers, and Server Actions. */
export async function getSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerSessionClient({
    getAll() {
      return cookieStore.getAll();
    },
    setAll(cookiesToSet) {
      try {
        for (const { name, value, options } of cookiesToSet) {
          cookieStore.set(name, value, options);
        }
      } catch {
        // Called from a Server Component with no response to attach cookies to —
        // middleware.ts below refreshes the session on every request, so this is safe to ignore.
      }
    },
  });
}
