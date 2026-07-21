"use server";

import { revalidatePath } from "next/cache";

import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { getRestaurant } from "@/lib/restaurant";

export type ActionResult = { ok: true } | { ok: false; error: string };

const MENU_PATH = "/dashboard/menu";

/**
 * Every action below relies on RLS for tenant isolation — the policies in
 * 0002_rls.sql already scope menu_categories to current_restaurant_id(), so a
 * forged id in the request simply matches no row. The restaurant lookup here is
 * only to stamp `restaurant_id` on inserts.
 */

export async function createCategory(name: string): Promise<ActionResult> {
  const t = await getT();
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: t.menu.categoryRequired };

  const restaurant = await getRestaurant();
  if (!restaurant) return { ok: false, error: t.onboarding.restaurantNotFound };

  const supabase = await createClient();

  // Append to the end: one past the current highest sort_order.
  const { data: last } = await supabase
    .from("menu_categories")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("menu_categories").insert({
    restaurant_id: restaurant.id,
    name: trimmed,
    sort_order: (last?.sort_order ?? -1) + 1,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath(MENU_PATH);
  return { ok: true };
}

export async function renameCategory(
  id: string,
  name: string
): Promise<ActionResult> {
  const t = await getT();
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: t.menu.categoryRequired };

  const supabase = await createClient();
  const { error } = await supabase
    .from("menu_categories")
    .update({ name: trimmed })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath(MENU_PATH);
  return { ok: true };
}

export async function setCategoryActive(
  id: string,
  isActive: boolean
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("menu_categories")
    .update({ is_active: isActive })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath(MENU_PATH);
  return { ok: true };
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("menu_categories").delete().eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath(MENU_PATH);
  return { ok: true };
}

/**
 * Persists a whole new order at once.
 *
 * Takes the full id list rather than "move this one up": swapping a pair leaves
 * the list wrong if two rows ever share a sort_order, and rewriting every row
 * from its index is self-healing.
 */
export async function reorderCategories(ids: string[]): Promise<ActionResult> {
  const supabase = await createClient();

  const results = await Promise.all(
    ids.map((id, index) =>
      supabase.from("menu_categories").update({ sort_order: index }).eq("id", id)
    )
  );

  const failed = results.find((result) => result.error);
  if (failed?.error) return { ok: false, error: failed.error.message };

  revalidatePath(MENU_PATH);
  return { ok: true };
}
