import { createServerClient, type CookieMethodsServer } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@29foods/supabase-client";

// Refreshes the Supabase auth session cookie on every request (required by @supabase/ssr's
// Next.js pattern) and gates /admin/* to signed-in admins only.
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (request.nextUrl.pathname.startsWith("/admin") && !request.nextUrl.pathname.startsWith("/admin/login")) {
    if (!user) {
      const loginUrl = new URL("/admin/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
    const { data: adminProfile } = await supabase.from("admin_profiles").select("id").eq("id", user.id).maybeSingle();
    if (!adminProfile) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
