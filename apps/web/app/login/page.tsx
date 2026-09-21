"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import logo from "@/public/images/brand/logo.png";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";
  const src = searchParams.get("src");

  async function signInWithGoogle() {
    const supabase = getSupabaseBrowserClient();
    const callbackUrl = new URL("/auth/callback", window.location.origin);
    callbackUrl.searchParams.set("next", next);
    if (src) callbackUrl.searchParams.set("src", src);

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl.toString() },
    });
  }

  return (
    <div className="flex min-h-[100dvh] w-full justify-center bg-[#EDE4D8] dark:bg-black md:items-center md:py-8">
      <div className="flex w-full flex-col items-center justify-center gap-6 bg-bg px-6 py-10 text-center md:h-[min(600px,90vh)] md:w-[430px] md:rounded-[32px] md:border md:border-border md:shadow-2xl">
        <Image src={logo} alt="29Foods" width={64} height={64} className="h-16 w-16 object-contain" />
        <div>
          <h1 className="text-2xl font-extrabold text-heading">Welcome to 29Foods</h1>
          <p className="mt-1 text-sm text-muted">Sign in to order and track your food.</p>
        </div>
        <button
          onClick={signInWithGoogle}
          className="flex items-center gap-3 rounded-full border border-border bg-card px-6 py-3 text-sm font-bold text-heading shadow-sm transition hover:shadow-md"
        >
          <GoogleIcon />
          Continue with Google
        </button>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M19.6 10.23c0-.68-.06-1.36-.18-2H10v3.79h5.38a4.6 4.6 0 01-2 3.02v2.5h3.23c1.9-1.75 2.99-4.33 2.99-7.31z"
      />
      <path
        fill="#34A853"
        d="M10 20c2.7 0 4.96-.89 6.62-2.42l-3.23-2.5c-.9.6-2.05.96-3.39.96-2.6 0-4.8-1.76-5.59-4.12H1.06v2.59A10 10 0 0010 20z"
      />
      <path
        fill="#FBBC05"
        d="M4.41 11.92A6 6 0 014.09 10c0-.67.11-1.32.32-1.92V5.49H1.06A10 10 0 000 10c0 1.61.38 3.14 1.06 4.51l3.35-2.59z"
      />
      <path
        fill="#EA4335"
        d="M10 3.96c1.47 0 2.79.5 3.82 1.5l2.87-2.87C14.95.99 12.7 0 10 0 6.09 0 2.7 2.24 1.06 5.49l3.35 2.6C5.2 5.72 7.4 3.96 10 3.96z"
      />
    </svg>
  );
}
