import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { NotificationSettingsView } from "@/components/NotificationSettingsView";

export default async function NotificationSettingsPage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) redirect("/login?next=/notifications/settings");

  const { data: profile } = await supabase.from("users").select("notification_prefs").eq("auth_uid", user.id).maybeSingle();
  if (!profile) redirect("/login?next=/notifications/settings");

  return <NotificationSettingsView initialPrefs={profile.notification_prefs} />;
}
