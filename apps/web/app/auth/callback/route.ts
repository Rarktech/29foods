import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { resolveOrCreateUserByGoogle } from "@29foods/core";

// Google OAuth redirects here with a `code` param; exchange it for a session,
// then resolve/create the matching `users` row (see packages/core/identity.ts).
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const sourceQr = request.nextUrl.searchParams.get("src") ?? undefined;
  const next = request.nextUrl.searchParams.get("next") ?? "/";

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", request.url));
  }

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    return NextResponse.redirect(new URL("/login?error=auth_failed", request.url));
  }

  const service = getSupabaseServiceClient();
  await resolveOrCreateUserByGoogle(service, {
    authUid: data.user.id,
    email: data.user.email ?? null,
    name: (data.user.user_metadata.full_name as string | undefined) ?? null,
    avatarUrl: (data.user.user_metadata.avatar_url as string | undefined) ?? null,
    sourceQr,
  });

  return NextResponse.redirect(new URL(next, request.url));
}
