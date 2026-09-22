import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { AdminShell } from "@/components/admin/AdminShell";

// middleware.ts already gates every /admin/* route (except /admin/login) to a
// signed-in admin — it calls the network-verified getUser() and confirms the
// admin_profiles row exists before this layout ever runs. Re-doing both checks
// here with getUser() was paying a second Auth-server round trip plus a second
// DB query on every admin page load for no extra security (middleware is the
// actual gate); getSession() reads the cookie middleware just validated and
// refreshed, so this only fetches the profile fields the shell needs to render.
export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSupabaseServerClient();
  const {
    data: { session: authSession },
  } = await session.auth.getSession();
  const user = authSession?.user ?? null;
  if (!user) redirect("/admin/login");

  const { data: profile } = await session.from("admin_profiles").select("role, name").eq("id", user.id).maybeSingle();
  if (!profile) redirect("/admin/login");

  return (
    <AdminShell profile={{ name: profile.name, email: user.email ?? null, role: profile.role }}>
      {children}
    </AdminShell>
  );
}
