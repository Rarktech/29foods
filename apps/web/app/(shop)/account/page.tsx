import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { PLAN_DURATIONS } from "@29foods/core";
import { AccountView } from "@/components/AccountView";
import { updateProfileAction } from "./actions";

export default async function AccountPage() {
  const supabase = await getSupabaseServerClient();
  // getSession() trusts the cookie middleware already validated — fast path for a
  // read-only page; the actual profile update goes through getUser() in ./actions.ts.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) redirect("/login?next=/account");

  const [{ data: profile }, { data: locations }, { data: subscription }] = await Promise.all([
    supabase.from("users").select("name, phone, lodge").eq("auth_uid", user.id).maybeSingle(),
    supabase
      .from("saved_locations")
      .select("id, label, lodge, room")
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: true }),
    supabase
      .from("subscriptions")
      .select("id, duration_id, start_date, end_date, deliveries_total, deliveries_used")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .maybeSingle(),
  ]);

  const duration = subscription ? PLAN_DURATIONS.find((d) => d.id === subscription.duration_id) : null;

  return (
    <AccountView
      name={profile?.name ?? user.email?.split("@")[0] ?? "You"}
      phone={profile?.phone ?? null}
      lodge={profile?.lodge ?? null}
      email={user.email ?? null}
      locations={locations ?? []}
      activeSubscription={
        subscription && duration
          ? {
              id: subscription.id,
              durationLabel: duration.label,
              startDate: subscription.start_date,
              endDate: subscription.end_date,
              deliveriesTotal: subscription.deliveries_total,
              deliveriesUsed: subscription.deliveries_used,
            }
          : null
      }
      updateProfileAction={updateProfileAction}
    />
  );
}
