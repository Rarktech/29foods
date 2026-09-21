import { createServerClient, type CookieMethodsServer } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@29foods/supabase-client";

// Refreshes the Supabase auth session cookie and gates /admin/* to signed-in
// admins only. `getUser()` re-validates the token against Supabase's auth
// server over the network on every call — worth it for the admin gate, but
// paying that round-trip on every single customer-facing page load (most of
// which are anonymous and never touch `user` at all) was adding real latency
// site-wide. `getSession()` is cookie-local and only hits the network when a
// refresh is actually due, so non-admin routes get cheap cookie upkeep and
// the admin gate keeps its server-verified check.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const cookieMethods: CookieMethodsServer = {
    getAll() {
      return request.cookies.getAll();
    },
    setAll(cookiesToSet) {
      for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
      response = NextResponse.next({ request });
      for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
    },
  };

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: cookieMethods },
  );

  const isAdminRoute = request.nextUrl.pathname.startsWith("/admin") && !request.nextUrl.pathname.startsWith("/admin/login");

  if (!isAdminRoute) {
    await supabase.auth.getSession();
    return response;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL("/admin/login", request.url);
    return NextResponse.redirect(loginUrl);
  }
  const { data: adminProfile } = await supabase.from("admin_profiles").select("id").eq("id", user.id).maybeSingle();
  if (!adminProfile) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
