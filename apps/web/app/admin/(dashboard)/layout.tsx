import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { AdminShell } from "@/components/admin/AdminShell";

// middleware.ts already gates every /admin/* route (except /admin/login) to a
// signed-in admin — this re-fetches the profile fields the shell needs to render.
export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSupabaseServerClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: profile } = await session.from("admin_profiles").select("role, name").eq("id", user.id).maybeSingle();
  if (!profile) redirect("/admin/login");

  return (
    <AdminShell profile={{ name: profile.name, email: user.email ?? null, role: profile.role }}>
      {children}
    </AdminShell>
  );
}
