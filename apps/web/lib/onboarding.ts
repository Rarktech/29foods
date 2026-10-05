"use client";

import { useCallback, useEffect, useState } from "react";
import type { OnboardingKey } from "@/lib/onboarding-keys";

const storageKey = (key: OnboardingKey) => `29foods.onboarding.${key}`;

function readLocal(key: OnboardingKey): boolean {
  try {
    return window.localStorage.getItem(storageKey(key)) === "1";
  } catch {
    return false; // storage blocked (private mode) — treat as unseen
  }
}

function writeLocal(key: OnboardingKey) {
  try {
    window.localStorage.setItem(storageKey(key), "1");
  } catch {
    // storage blocked — the account flag (if signed in) still records it
  }
}

function recordOnAccount(key: OnboardingKey) {
  void fetch("/api/onboarding", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key }),
  }).catch(() => {});
}

/**
 * Whether this user has already finished or skipped a tour/tip.
 *
 * `accountSeen` comes from the server: a boolean for signed-in users (users.onboarding),
 * null for guests. Signed in, the account decides; as a guest, the browser does. If a
 * guest finished the tour and then signed in, the browser's "seen" wins and is copied to
 * the account, so it never replays. `ready` stays false until the browser has been read,
 * so nothing flashes open on first paint.
 */
export function useOnboardingSeen(key: OnboardingKey, accountSeen: boolean | null) {
  const [seen, setSeen] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const local = readLocal(key);
    if (accountSeen === null) {
      setSeen(local);
    } else if (!accountSeen && local) {
      recordOnAccount(key); // seen as a guest, now signed in — carry it over
      setSeen(true);
    } else {
      setSeen(accountSeen);
    }
    setReady(true);
  }, [key, accountSeen]);

  const markSeen = useCallback(() => {
    setSeen(true);
    writeLocal(key);
    if (accountSeen !== null) recordOnAccount(key);
  }, [key, accountSeen]);

  return { seen, ready, markSeen };
}
