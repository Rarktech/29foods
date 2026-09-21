import { getSupabaseServerClient } from "@/lib/supabase/server";
import { CartScreen } from "@/components/CartScreen";

export default async function CartPage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: { id: string; phone: string | null } | null = null;
  let savedLocations: { id: string; label: string; lodge: string; room: string | null; note: string | null }[] = [];

  if (user) {
    const { data: profileRow } = await supabase.from("users").select("id, phone").eq("auth_uid", user.id).maybeSingle();
    profile = profileRow;

    const { data: locations } = await supabase
      .from("saved_locations")
      .select("id, label, lodge, room, note")
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: true });
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
