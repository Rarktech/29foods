import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { ONBOARDING_KEYS, type OnboardingKey } from "@/lib/onboarding-keys";

/** Marks a tour or tip as seen on the signed-in user's account. Guests get 401 and keep it in the browser instead. */
export async function POST(request: Request) {
  const session = await getSupabaseServerClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { key } = (await request.json()) as { key?: string };
  if (!key || !ONBOARDING_KEYS.includes(key as OnboardingKey)) {
    return NextResponse.json({ error: "Unknown tour." }, { status: 400 });
  }

  const service = getSupabaseServiceClient();
  const { data: profile } = await service.from("users").select("id, onboarding").eq("auth_uid", user.id).maybeSingle();
  if (!profile) return NextResponse.json({ error: "Account not found." }, { status: 400 });
  if (profile.onboarding?.[key]) return NextResponse.json({ ok: true }); // already recorded

  const { error } = await service
    .from("users")
    .update({ onboarding: { ...(profile.onboarding ?? {}), [key]: new Date().toISOString() } })
    .eq("id", profile.id);
  if (error) throw error;
  return NextResponse.json({ ok: true });
}
