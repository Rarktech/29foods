import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@29foods/supabase-client";

type Client = SupabaseClient<Database>;
type RiderRow = Database["public"]["Tables"]["riders"]["Row"];

export const RIDER_INVITE_TTL_HOURS = 24;
// No 0/O/1/I — the code may get read out or retyped.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export class RiderInviteError extends Error {
  constructor(public reason: "invalid" | "already_linked") {
    super(reason);
  }
}

// Web Crypto rather than node:crypto — this package's barrel is also bundled into client components.
function newInviteCode(): string {
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(8));
  // 256 is a multiple of the 32-letter alphabet, so the modulo is unbiased.
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}

function inviteExpiry(): string {
  return new Date(Date.now() + RIDER_INVITE_TTL_HOURS * 60 * 60 * 1000).toISOString();
}

/** Deep link a rider taps to join; the rider bot reads the `join_` payload on /start. */
export function riderInviteLink(riderBotUsername: string, code: string): string {
  return `https://t.me/${riderBotUsername}?start=join_${code}`;
}

export async function createRiderWithInvite(supabase: Client, params: { name: string; phone: string | null }): Promise<RiderRow> {
  const { data, error } = await supabase
    .from("riders")
    .insert({ name: params.name, phone: params.phone, invite_code: newInviteCode(), invite_expires_at: inviteExpiry() })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

/** Fresh code + expiry for a rider who hasn't joined yet (or lost the link). */
export async function refreshRiderInvite(supabase: Client, riderId: string): Promise<RiderRow> {
  const { data, error } = await supabase
    .from("riders")
    .update({ invite_code: newInviteCode(), invite_expires_at: inviteExpiry() })
    .eq("id", riderId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

/** Links the tapping Telegram account to the invited rider. One use, expires after RIDER_INVITE_TTL_HOURS. */
export async function claimRiderInvite(supabase: Client, code: string, telegramId: number): Promise<RiderRow> {
  const { data, error } = await supabase.rpc("claim_rider_invite", { p_code: code, p_telegram_id: telegramId });
  if (error) {
    if (error.message.includes("TELEGRAM_ALREADY_LINKED")) throw new RiderInviteError("already_linked");
    if (error.message.includes("INVITE_INVALID")) throw new RiderInviteError("invalid");
    throw error;
  }
  return data;
}

export async function setRiderActive(supabase: Client, riderId: string, isActive: boolean): Promise<void> {
  const update = isActive ? { is_active: true } : { is_active: false, cycle_status: "offline" as const };
  const { error } = await supabase.from("riders").update(update).eq("id", riderId);
  if (error) throw error;
}
