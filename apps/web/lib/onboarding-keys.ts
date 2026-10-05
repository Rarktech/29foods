/** Tours/tips tracked in users.onboarding. Shared by server pages, the API route and the client hook. */
export const ONBOARDING_KEYS = ["homeTour", "cartTip", "youTip"] as const;
export type OnboardingKey = (typeof ONBOARDING_KEYS)[number];

/** What a server page passes down: a boolean for signed-in users, null for guests (the browser decides). */
export function accountSeenFlag(onboarding: Record<string, string> | null | undefined, key: OnboardingKey, signedIn: boolean): boolean | null {
  return signedIn ? !!onboarding?.[key] : null;
}
