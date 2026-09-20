import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@29foods/supabase-client";

type Client = SupabaseClient<Database>;
type UserRow = Database["public"]["Tables"]["users"]["Row"];

/**
 * Every front-end resolves to a `users` row through exactly one of these two
 * entry points — never insert into `users` directly from app code. A row may
 * hold `auth_uid` (web/Google), `telegram_id` (bot), or both once merged via
 * linkPhoneToUser.
 */

export async function resolveOrCreateUserByGoogle(
  supabase: Client,
  params: { authUid: string; email: string | null; name: string | null; avatarUrl: string | null; sourceQr?: string },
): Promise<UserRow> {
  const { data: existing, error: findError } = await supabase
    .from("users")
    .select("*")
    .eq("auth_uid", params.authUid)
    .maybeSingle();
  if (findError) throw findError;
  if (existing) return existing;

  const { data: created, error: insertError } = await supabase
    .from("users")
    .insert({
      auth_uid: params.authUid,
      email: params.email,
      name: params.name,
      avatar_url: params.avatarUrl,
      acquired_via_qr: params.sourceQr ?? null,
    })
    .select("*")
    .single();
  if (insertError) throw insertError;
  return created;
}

export async function resolveOrCreateUserByTelegram(
  supabase: Client,
  params: { telegramId: number; name: string | null; sourceQr?: string },
): Promise<UserRow> {
  const { data: existing, error: findError } = await supabase
    .from("users")
    .select("*")
    .eq("telegram_id", params.telegramId)
    .maybeSingle();
  if (findError) throw findError;
  if (existing) return existing;

  const { data: created, error: insertError } = await supabase
    .from("users")
    .insert({
      telegram_id: params.telegramId,
      name: params.name,
      acquired_via_qr: params.sourceQr ?? null,
    })
    .select("*")
    .single();
  if (insertError) throw insertError;
  return created;
}

/**
 * User-initiated cross-surface link. If another `users` row already holds this
 * phone, the older row (by created_at) becomes canonical — identifiers, orders,
 * and feedback are merged onto it and the newer duplicate row is deleted.
 * See supabase/migrations/20260920000000_init_schema.sql: link_phone_merge().
 */
export async function linkPhoneToUser(supabase: Client, userId: string, phone: string): Promise<UserRow> {
  const { data, error } = await supabase.rpc("link_phone_merge", {
    p_current_user_id: userId,
    p_phone: phone,
  });
  if (error) throw error;
  return data;
}

const EDITABLE_PROFILE_FIELDS = ["name", "lodge", "room"] as const;
type EditableProfileField = (typeof EDITABLE_PROFILE_FIELDS)[number];
type ProfileUpdate = Partial<Pick<UserRow, EditableProfileField>>;

/**
 * Whitelisted profile edit — deliberately cannot touch loyalty_points,
 * telegram_id, auth_uid, or phone (phone has separate merge semantics, see
 * linkPhoneToUser). Callers should only ever pass user-supplied fields through
 * this function, never a raw client payload straight into a table update.
 */
export async function updateProfile(supabase: Client, userId: string, update: ProfileUpdate): Promise<UserRow> {
  const safeUpdate: ProfileUpdate = {};
  for (const field of EDITABLE_PROFILE_FIELDS) {
    if (field in update) safeUpdate[field] = update[field];
  }

  const { data, error } = await supabase.from("users").update(safeUpdate).eq("id", userId).select("*").single();
  if (error) throw error;
  return data;
}
