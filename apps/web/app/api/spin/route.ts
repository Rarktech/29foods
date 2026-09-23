import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { PRIZES, pickPrizeIndex, hasSpunToday, recordSpin } from "@29foods/core";

export async function POST() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });

  const { data: profile } = await supabase.from("users").select("id").eq("auth_uid", user.id).single();
  if (!profile) return NextResponse.json({ error: "Account not found." }, { status: 400 });

  // spin_wins has no client write policy — only this server route (already identity-verified
  // above) may write here.
  const service = getSupabaseServiceClient();

  if (await hasSpunToday(service, profile.id)) {
    return NextResponse.json({ error: "You've already used today's free spin." }, { status: 409 });
  }

  const index = pickPrizeIndex();
  const prize = PRIZES[index]!;
  const win = await recordSpin(service, profile.id, index);

  return NextResponse.json({ index, prize, expiresAt: win.expires_at });
}
