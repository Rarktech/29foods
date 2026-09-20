import { createServiceClient } from "@29foods/supabase-client";

let client: ReturnType<typeof createServiceClient> | null = null;

/** Bots run entirely server-side and always use the service-role client — there's no browser session to scope RLS to. */
export function getServiceClient() {
  if (!client) client = createServiceClient();
  return client;
}
