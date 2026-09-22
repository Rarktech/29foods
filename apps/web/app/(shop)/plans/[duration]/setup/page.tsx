import { notFound } from "next/navigation";
import { PLAN_DURATIONS } from "@29foods/core";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { PlanSetupForm } from "@/components/plans/PlanSetupForm";

export default async function PlanSetupPage({ params }: { params: Promise<{ duration: string }> }) {
  const { duration: durationId } = await params;
  const duration = PLAN_DURATIONS.find((d) => d.id === durationId);
  if (!duration) notFound();

  const supabase = await getSupabaseServerClient();
  // getSession() trusts the cookie middleware already validated — subscription
  // creation itself re-verifies with getUser() in the API route.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  let defaultLocation: { lodge: string; room: string | null; label: string } | null = null;
  if (user) {
    const { data: locations } = await supabase
      .from("saved_locations")
      .select("lodge, room, label")
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(1);
    if (locations && locations[0]) defaultLocation = locations[0];
    if (!defaultLocation) {
      const { data: profile } = await supabase.from("users").select("lodge, room").eq("auth_uid", user.id).maybeSingle();
      if (profile?.lodge) defaultLocation = { lodge: profile.lodge, room: profile.room, label: "home" };
    }
  }

  return <PlanSetupForm duration={duration} isLoggedIn={!!user} defaultLocation={defaultLocation} />;
}
