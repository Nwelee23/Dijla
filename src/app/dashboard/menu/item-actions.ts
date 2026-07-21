"use server";

import { revalidatePath } from "next/cache";

import { getT } from "@/lib/i18n/server";
import type { Dictionary } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import { getRestaurant } from "@/lib/restaurant";

import type { ActionResult } from "./actions";

const MENU_PATH = "/dashboard/menu";
const BUCKET = "menu-images";

export type ItemInput = {
  name: string;
  description: string;
  price: number;
  imageUrl: string | null;
  categoryId: string | null;
};

function validate(input: ItemInput, t: Dictionary): string | null {
  if (!input.name.trim()) return t.menu.itemNameRequired;
  if (!Number.isFinite(input.price) || input.price < 0) {
    return t.menu.invalidPrice;
  }
  return null;
}

/**
 * Storage path from a public URL, or null if the URL is not ours.
 * Used to clean up images so deleted dishes don't leave paid storage behind.
 */
function storagePathFromUrl(url: string): string | null {
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const index = url.indexOf(marker);
  return index === -1 ? null : url.slice(index + marker.length);
}

export async function createItem(input: ItemInput): Promise<ActionResult> {
  const t = await getT();
  const invalid = validate(input, t);
  if (invalid) return { ok: false, error: invalid };

  const restaurant = await getRestaurant();
  if (!restaurant) return { ok: false, error: t.onboarding.restaurantNotFound };

  const supabase = await createClient();

  // Append within its own category, so adding to one section doesn't
  // disturb the ordering of another.
  const { data: last } = await supabase
    .from("menu_items")
    .select("sort_order")
    .eq("category_id", input.categoryId ?? "")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("menu_items").insert({
    restaurant_id: restaurant.id,
    category_id: input.categoryId,
    name: input.name.trim(),
    description: input.description.trim() || null,
    price: input.price,
    image_url: input.imageUrl,
    sort_order: (last?.sort_order ?? -1) + 1,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath(MENU_PATH);
  return { ok: true };
}

export async function updateItem(
  id: string,
  input: ItemInput
): Promise<ActionResult> {
  const t = await getT();
  const invalid = validate(input, t);
  if (invalid) return { ok: false, error: invalid };

  const supabase = await createClient();

  // Read the old image first: if it was replaced, the old file is now orphaned.
  const { data: existing } = await supabase
    .from("menu_items")
    .select("image_url")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase
    .from("menu_items")
    .update({
      category_id: input.categoryId,
      name: input.name.trim(),
      description: input.description.trim() || null,
      price: input.price,
      image_url: input.imageUrl,
    })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  if (existing?.image_url && existing.image_url !== input.imageUrl) {
    const path = storagePathFromUrl(existing.image_url);
    // Best effort — a leftover file is much cheaper than a failed save.
    if (path) await supabase.storage.from(BUCKET).remove([path]);
  }

  revalidatePath(MENU_PATH);
  return { ok: true };
}

export async function setItemAvailable(
  id: string,
  isAvailable: boolean
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("menu_items")
    .update({ is_available: isAvailable })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath(MENU_PATH);
  return { ok: true };
}

export async function deleteItem(id: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("menu_items")
    .select("image_url")
    .eq("id", id)
    .maybeSingle();

  // Row first: losing the photo while keeping the dish is the lesser failure.
  const { error } = await supabase.from("menu_items").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  if (existing?.image_url) {
    const path = storagePathFromUrl(existing.image_url);
    if (path) await supabase.storage.from(BUCKET).remove([path]);
  }

  revalidatePath(MENU_PATH);
  return { ok: true };
}

export async function reorderItems(ids: string[]): Promise<ActionResult> {
  const supabase = await createClient();

  const results = await Promise.all(
    ids.map((id, index) =>
      supabase.from("menu_items").update({ sort_order: index }).eq("id", id)
    )
  );

  const failed = results.find((result) => result.error);
  if (failed?.error) return { ok: false, error: failed.error.message };

  revalidatePath(MENU_PATH);
  return { ok: true };
}
