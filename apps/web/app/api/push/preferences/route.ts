import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import type { NotificationPrefs } from "@29foods/supabase-client";

export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });

  const patch = (await request.json()) as Partial<NotificationPrefs>;

  // users has no client write policy (see 20260920000000_init_schema.sql) — profile-shaped
  // edits go through server code using the service client, same as ./account/actions.ts.
  const service = getSupabaseServiceClient();
  const { data: profile } = await service.from("users").select("id, notification_prefs").eq("auth_uid", user.id).single();
  if (!profile) return NextResponse.json({ error: "Account not found." }, { status: 400 });

  const merged: NotificationPrefs = { ...profile.notification_prefs, ...patch };
  const { error } = await service.from("users").update({ notification_prefs: merged }).eq("id", profile.id);
  if (error) return NextResponse.json({ error: "Could not save preferences." }, { status: 400 });

  return NextResponse.json({ ok: true, prefs: merged });
}
