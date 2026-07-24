import "server-only";

import webpush from "web-push";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Server-side Web Push (REDESIGN_V2_SPEC §11). Sends a new-order notification to
 * every device a restaurant's staff has subscribed, so an order is caught even
 * with the dashboard closed.
 *
 * Sending must NEVER block or fail the order — the caller fires this from
 * `after()` and every error here is swallowed (dead subscriptions are pruned).
 * With no VAPID keys configured (dev / CI) it silently no-ops.
 */

let configured: boolean | null = null;

function ensureConfigured(): boolean {
  if (configured !== null) return configured;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:support@dijla.app";
  if (!publicKey || !privateKey) {
    configured = false;
    return false;
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

export type NewOrderPush = {
  orderNumber: number;
  type: "dine_in" | "delivery" | "pickup";
  total: number;
  /** Table label or customer name, shown in the notification body. */
  context: string | null;
};

export async function sendNewOrderPush(
  restaurantId: string,
  payload: NewOrderPush
): Promise<void> {
  if (!ensureConfigured()) return;

  const admin = createAdminClient();
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("restaurant_id", restaurantId);

  if (!subs || subs.length === 0) return;

  const body = JSON.stringify({ kind: "new_order", ...payload });

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body
        );
      } catch (error) {
        const status = (error as { statusCode?: number } | null)?.statusCode;
        // Gone / not found → the subscription is dead; prune it.
        if (status === 404 || status === 410) {
          await admin.from("push_subscriptions").delete().eq("id", sub.id);
        } else {
          console.error("push send failed", status ?? error);
        }
      }
    })
  );
}
