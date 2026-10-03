import type { StorageAdapter } from "grammy";
import type { Json } from "@29foods/supabase-client";
import { getServiceClient } from "./supabase";
import { initialSession, type SessionData } from "./session";

/**
 * grammY session storage over the bot_sessions table, so carts and half-finished
 * checkouts survive a restart and the sweeper can find abandoned carts. Keys are
 * grammY's default session key — the chat id, which in a private chat is the user's
 * Telegram id.
 */
export const supabaseStorage: StorageAdapter<SessionData> = {
  async read(key) {
    const { data } = await getServiceClient().from("bot_sessions").select("value").eq("key", key).maybeSingle();
    // Merge over the defaults so sessions saved before a field existed still get it.
    return data ? { ...initialSession(), ...(data.value as unknown as Partial<SessionData>) } : undefined;
  },
  async write(key, value) {
    const { error } = await getServiceClient()
      .from("bot_sessions")
      .upsert({ key, value: value as unknown as Json, updated_at: new Date().toISOString() });
    if (error) console.error("session write failed:", error);
  },
  async delete(key) {
    await getServiceClient().from("bot_sessions").delete().eq("key", key);
  },
};

/** Edits a user's session from outside an update (Realtime events, the sweeper). */
export async function updateSession(chatId: number | string, mutate: (session: SessionData) => void): Promise<SessionData> {
  const key = String(chatId);
  const session = (await supabaseStorage.read(key)) ?? initialSession();
  mutate(session);
  await supabaseStorage.write(key, session);
  return session;
}
