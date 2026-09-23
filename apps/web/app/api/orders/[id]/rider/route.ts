import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceClient } from "@/lib/supabase/service";

// riders is admin-only RLS, so a client can't ever learn a newly-assigned rider's name
// live via a postgres_changes subscription — only the page's own initial server-side
// render (getSupabaseServiceClient there) could see it. This route lets the client
// backfill that after a realtime stage change, re-verifying the order belongs to the
// caller before returning anything.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });

  const { data: profile } = await supabase.from("users").select("id").eq("auth_uid", user.id).single();
  if (!profile) return NextResponse.json({ error: "Account not found." }, { status: 400 });

  const service = getSupabaseServiceClient();
  const { data: order } = await service.from("orders").select("user_id, assigned_rider_id").eq("id", id).maybeSingle();
  if (!order || order.user_id !== profile.id) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (!order.assigned_rider_id) return NextResponse.json({ rider: null });

  const { data: rider } = await service.from("riders").select("name, phone").eq("id", order.assigned_rider_id).maybeSingle();
  return NextResponse.json({ rider: rider ? { name: rider.name, phone: rider.phone } : null });
}
