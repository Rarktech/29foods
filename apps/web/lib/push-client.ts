"use client";

/** Converts the VAPID public key (base64url) into the Uint8Array pushManager.subscribe expects. */
function urlBase64ToUint8Array(base64Url: string): Uint8Array {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function isPushSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

/**
 * Registers /sw.js (idempotent — a no-op if already registered) and waits for it to
 * become active, with a timeout. `navigator.serviceWorker.ready` on its own can hang
 * forever with zero feedback if registration never settles (e.g. a slow first visit,
 * or a stuck "waiting" worker) — that hang previously looked exactly like the toggle
 * silently doing nothing when tapped.
 */
export async function getReadyRegistration(): Promise<ServiceWorkerRegistration> {
  if (!isPushSupported()) throw new Error("Push isn't supported in this browser.");
  await navigator.serviceWorker.register("/sw.js").catch(() => {});
  const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Service worker took too long to start.")), 8000));
  return Promise.race([navigator.serviceWorker.ready, timeout]);
}

/** Requests OS permission, subscribes via the service worker, and saves the subscription server-side. Throws if the user declines. */
export async function enablePush(): Promise<void> {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Notifications permission was not granted.");

  const registration = await getReadyRegistration();
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) throw new Error("Push is not configured.");

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
  });
  const json = subscription.toJSON();

  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
  });
  if (!res.ok) throw new Error("Could not save your subscription.");
}

export async function disablePush(): Promise<void> {
  if (!isPushSupported()) return;
  const registration = await getReadyRegistration().catch(() => null);
  if (!registration) return;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;

  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  await fetch("/api/push/unsubscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint }),
  });
}

export async function getPushPermissionState(): Promise<NotificationPermission | "unsupported"> {
  if (!isPushSupported()) return "unsupported";
  return Notification.permission;
}
