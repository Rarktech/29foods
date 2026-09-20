import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });

  const body = await request.json();
  const { orderId, reaction, comment } = body as { orderId: string; reaction: "fire" | "neutral" | "down"; comment?: string };

  const { data: profile } = await supabase.from("users").select("id").eq("auth_uid", user.id).single();
  if (!profile) return NextResponse.json({ error: "Account not found." }, { status: 400 });

  // RLS's "feedback insert own" policy enforces the order both belongs to this user and is delivered.
  const { error } = await supabase.from("feedback").insert({ order_id: orderId, user_id: profile.id, reaction, comment: comment ?? null });
  if (error) return NextResponse.json({ error: "Could not save feedback." }, { status: 400 });

  return NextResponse.json({ ok: true });
}
