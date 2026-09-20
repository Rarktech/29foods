import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { CheckoutForm } from "@/components/CheckoutForm";

export default async function CheckoutPage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/checkout");
  }

  const service = getSupabaseServiceClient();
  const { data: profile } = await service.from("users").select("*").eq("auth_uid", user.id).maybeSingle();

  return (
    <main className="mx-auto max-w-2xl px-4 pb-28 pt-8">
      <h1 className="mb-6 text-2xl font-bold">Where's it going?</h1>
      <CheckoutForm
        savedLodge={profile?.lodge ?? null}
        savedRoom={profile?.room ?? null}
        userEmail={user.email ?? null}
        userName={profile?.name ?? null}
        userPhone={profile?.phone ?? null}
      />
    </main>
  );
}
