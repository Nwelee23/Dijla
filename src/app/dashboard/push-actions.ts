"use server";

import { getRestaurant } from "@/lib/restaurant";
import { createClient } from "@/lib/supabase/server";

/**
 * Store a device's PushSubscription (REDESIGN_V2_SPEC §11). Scoped to the
 * signed-in user by RLS (user_id = auth.uid()); the restaurant is attached so
 * the server send path can reach a restaurant's staff. Upsert on the unique
 * endpoint so re-subscribing refreshes rather than duplicates.
 */
export async function savePushSubscription(
  endpoint: string,
  p256dh: string,
  auth: string,
  userAgent: string
): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const restaurant = await getRestaurant();

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      restaurant_id: restaurant?.id ?? null,
      endpoint,
      p256dh,
      auth,
      user_agent: userAgent.slice(0, 300),
    },
    { onConflict: "endpoint" }
  );

  return { ok: !error };
}

export async function removePushSubscription(
  endpoint: string
): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint);
  return { ok: !error };
}
