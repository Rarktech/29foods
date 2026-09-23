import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceClient } from "@/lib/supabase/service";

export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });

  const body = await request.json();
  const { endpoint } = body as { endpoint: string };
  if (!endpoint) return NextResponse.json({ error: "Missing endpoint." }, { status: 400 });

  const { data: profile } = await supabase.from("users").select("id").eq("auth_uid", user.id).single();
  if (!profile) return NextResponse.json({ error: "Account not found." }, { status: 400 });

  const service = getSupabaseServiceClient();
  // Scoped by user_id too, not just endpoint — a caller can only ever remove their own subscription.
  await service.from("push_subscriptions").delete().eq("user_id", profile.id).eq("endpoint", endpoint);

  return NextResponse.json({ ok: true });
}
