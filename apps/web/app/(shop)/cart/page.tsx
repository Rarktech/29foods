import { getSupabaseServerClient } from "@/lib/supabase/server";
import { CartScreen } from "@/components/CartScreen";

export default async function CartPage() {
  const supabase = await getSupabaseServerClient();
  // getSession() trusts the cookie middleware already validated — checkout itself
  // re-verifies with getUser() before placing an order.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  let profile: { id: string; phone: string | null } | null = null;
  let savedLocations: { id: string; label: string; lodge: string; room: string | null; note: string | null }[] = [];

  if (user) {
    const [{ data: profileRow }, { data: locations }] = await Promise.all([
      supabase.from("users").select("id, phone").eq("auth_uid", user.id).maybeSingle(),
      supabase
        .from("saved_locations")
        .select("id, label, lodge, room, note")
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: true }),
    ]);
    profile = profileRow;
    savedLocations = locations ?? [];
  }

  return (
    <CartScreen
      isLoggedIn={!!user}
      userId={profile?.id ?? null}
      userPhone={profile?.phone ?? null}
      initialSavedLocations={savedLocations}
    />
  );
}
