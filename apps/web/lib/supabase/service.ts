import { createServiceClient } from "@29foods/supabase-client";

/** Service-role client — only import from Route Handlers / Server Actions, never a Client Component. */
export function getSupabaseServiceClient() {
  return createServiceClient();
}
