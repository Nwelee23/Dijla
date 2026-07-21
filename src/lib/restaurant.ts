import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/types";

export type Restaurant = Tables<"restaurants">;

/**
 * The signed-in user's restaurant, or null before onboarding.
 *
 * No filter is needed: RLS already narrows `restaurants` to the caller's own
 * row. Cached per request so the layout and the page share one query.
 */
export const getRestaurant = cache(async (): Promise<Restaurant | null> => {
  const supabase = await createClient();
  const { data } = await supabase.from("restaurants").select("*").maybeSingle();

  return data;
});
