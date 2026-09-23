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
  const { id, all } = body as { id?: string; all?: boolean };

  const { data: profile } = await supabase.from("users").select("id").eq("auth_uid", user.id).single();
  if (!profile) return NextResponse.json({ error: "Account not found." }, { status: 400 });

  const service = getSupabaseServiceClient();
  let query = service.from("notifications").update({ read: true }).eq("user_id", profile.id);
  if (!all) {
    if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
    query = query.eq("id", id);
  }
  const { error } = await query;
  if (error) return NextResponse.json({ error: "Could not update." }, { status: 400 });

  return NextResponse.json({ ok: true });
}
