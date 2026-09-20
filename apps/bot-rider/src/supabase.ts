import { createServiceClient } from "@29foods/supabase-client";

let client: ReturnType<typeof createServiceClient> | null = null;

export function getServiceClient() {
  if (!client) client = createServiceClient();
  return client;
}
