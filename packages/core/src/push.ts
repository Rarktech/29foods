import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, NotificationPrefs } from "@29foods/supabase-client";

type Client = SupabaseClient<Database>;
type NotificationKind = Database["public"]["Tables"]["notifications"]["Row"]["kind"];

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function configureVapid() {
  webpush.setVapidDetails(requireEnv("VAPID_SUBJECT"), requireEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY"), requireEnv("VAPID_PRIVATE_KEY"));
}

export interface PushPayload {
  title: string;
  body: string;
  href?: string;
  thumbUrl?: string;
  tag?: string;
  orderId?: string;
}

/** Sends one payload to every subscription on file for a user; prunes any the push service reports gone (404/410). */
async function pushToUser(supabase: Client, userId: string, payload: PushPayload): Promise<void> {
  const { data: subs } = await supabase.from("push_subscriptions").select("id, endpoint, p256dh, auth").eq("user_id", userId);
  if (!subs?.length) return;

  configureVapid();
  const body = JSON.stringify(payload);

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, body);
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        }
        // Any other failure (network blip, service outage) is left alone — not worth
        // dropping a subscription over a transient error.
      }
    }),
  );
}

function isQuietHoursNow(prefs: NotificationPrefs): boolean {
  if (!prefs.quiet) return false;
  // Nigeria is UTC+1 with no DST — quietFrom/quietTo are stored in local (WAT) wall-clock
  // time, so shift "now" forward by one hour to compare on the same clock.
  const localNow = new Date(Date.now() + 60 * 60 * 1000);
  const local = `${String(localNow.getUTCHours()).padStart(2, "0")}:${String(localNow.getUTCMinutes()).padStart(2, "0")}`;
  const { quietFrom, quietTo } = prefs;
  if (quietFrom <= quietTo) return local >= quietFrom && local < quietTo;
  return local >= quietFrom || local < quietTo; // wraps past midnight, e.g. 22:00–07:00
}

const KIND_PREF_KEY: Record<NotificationKind, keyof NotificationPrefs | null> = {
  order_delivered: "delivered",
  deal: "flash",
  menu_drop: "menuDrop",
  loyalty: "points",
  cart_reminder: "cartNudge",
  plan_renew: "planRenew",
  plan_expired: "planRenew",
  referral: "referral",
  winback: "winback",
};

export interface NotifyUserInput {
  userId: string;
  kind: NotificationKind;
  title: string;
  body: string;
  href?: string;
  thumbUrl?: string;
  orderId?: string;
}

/**
 * Records a notification in the user's in-app history and, if they haven't muted this
 * kind (and it isn't quiet hours), sends a matching push. In-app history always gets
 * the row regardless of push preference — muting push shouldn't erase the notification,
 * just the interruption.
 */
export async function notifyUser(supabase: Client, input: NotifyUserInput): Promise<void> {
  await supabase.from("notifications").insert({
    user_id: input.userId,
    kind: input.kind,
    title: input.title,
    body: input.body,
    href: input.href ?? null,
    thumb_url: input.thumbUrl ?? null,
    order_id: input.orderId ?? null,
  });

  const { data: user } = await supabase.from("users").select("notification_prefs").eq("id", input.userId).maybeSingle();
  const prefs = user?.notification_prefs;
  if (!prefs?.push) return;

  const prefKey = KIND_PREF_KEY[input.kind];
  if (prefKey && !prefs[prefKey]) return;
  if (isQuietHoursNow(prefs)) return;

  await pushToUser(supabase, input.userId, {
    title: input.title,
    body: input.body,
    href: input.href,
    thumbUrl: input.thumbUrl,
    tag: input.kind,
  });
}

export type OrderProgressStage = "preparing" | "rider_assigned" | "on_the_way" | "delivered";

const STAGE_LABEL: Record<OrderProgressStage, string> = {
  preparing: "Preparing",
  rider_assigned: "Rider assigned",
  on_the_way: "On the way",
  delivered: "Delivered",
};

export interface OrderProgressInput {
  userId: string;
  orderId: string;
  shortOrderId: string; // e.g. "29F-1042" — what the reference copy shows, not the uuid
  stage: OrderProgressStage;
  dishSummary: string;
  dishImageUrl?: string | null; // shown as the notification-centre row's thumbnail once delivered
  lodge: string;
  room: string | null;
  etaMinutes: number;
  riderName: string | null;
}

/**
 * The single live-order push — same notification id (tag) reused at every stage so it
 * updates in place instead of stacking, matching the reference exactly. This bypasses
 * both the per-kind toggle and quiet hours on purpose: order progress is the one thing
 * that can't be turned off while an order is live (see Notification settings copy).
 */
export async function sendOrderProgressPush(supabase: Client, input: OrderProgressInput): Promise<void> {
  const { title, body } = buildOrderProgressCopy(input);
  await pushToUser(supabase, input.userId, {
    title,
    body,
    href: `/order/${input.orderId}`,
    tag: `order-${input.orderId}`,
    orderId: input.orderId,
  });

  if (input.stage === "delivered") {
    await supabase.from("notifications").insert({
      user_id: input.userId,
      kind: "order_delivered",
      title,
      body,
      href: `/order/${input.orderId}`,
      order_id: input.orderId,
      thumb_url: input.dishImageUrl ?? null,
    });
  }
}

export function buildOrderProgressCopy(input: OrderProgressInput): { title: string; body: string } {
  const title = `${input.shortOrderId} · ${STAGE_LABEL[input.stage]}`;
  const place = `${input.lodge}${input.room ? `, ${input.room}` : ""}`;
  switch (input.stage) {
    case "preparing":
      return { title, body: `${input.dishSummary} is on the fire. Arriving in ${input.etaMinutes} min at ${place}.` };
    case "rider_assigned":
      return { title, body: `${input.riderName ?? "Your rider"} has your pack and is leaving the kitchen. ${input.etaMinutes} min away.` };
    case "on_the_way":
      return { title, body: `${input.riderName ?? "Your rider"} is on the way to ${place}. ${input.etaMinutes} min — keep your phone close.` };
    case "delivered":
      return { title, body: `Handed over at ${place}. Tap to rate ${input.riderName ? `${input.riderName} and ` : ""}your order.` };
  }
}
