import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { hasSpunToday } from "@29foods/core";
import { SpinWheelView } from "@/components/SpinWheelView";

export default async function SpinPage() {
  const supabase = await getSupabaseServerClient();
  // getSession() trusts the cookie middleware already validated — this page only reads;
  // the actual spin write happens server-side in /api/spin with a fresh getUser() check.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) redirect("/login?next=/spin");

  const { data: profile } = await supabase.from("users").select("id").eq("auth_uid", user.id).maybeSingle();
  if (!profile) redirect("/login?next=/spin");

  const spunToday = await hasSpunToday(supabase, profile.id);

  return <SpinWheelView initialSpinsLeft={spunToday ? 0 : 1} />;
}
