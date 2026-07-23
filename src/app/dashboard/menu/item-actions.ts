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
  nameSecondary: string;
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
    name_secondary: input.nameSecondary.trim() || null,
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
      name_secondary: input.nameSecondary.trim() || null,
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

/**
 * Duplicate an item with all its option groups and options (MENU_BUILDER_SPEC
 * §2.2) — most dishes are variants of each other, so cloning then tweaking beats
 * retyping. The copy is appended in the same category with a "نسخة" suffix.
 *
 * The image is deliberately NOT copied: two rows pointing at one storage file
 * would break the survivor when the other is deleted (delete removes the file).
 * The owner adds a photo to the copy if they want one.
 */
export async function duplicateItem(id: string): Promise<ActionResult> {
  const t = await getT();
  const supabase = await createClient();

  const { data: item } = await supabase
    .from("menu_items")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!item) return { ok: false, error: t.menu.itemNotFound };

  const { data: last } = await supabase
    .from("menu_items")
    .select("sort_order")
    .eq("category_id", item.category_id ?? "")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: copy, error } = await supabase
    .from("menu_items")
    .insert({
      restaurant_id: item.restaurant_id,
      category_id: item.category_id,
      name: `${item.name} ${t.menu.copySuffix}`,
      name_secondary: item.name_secondary,
      description: item.description,
      description_secondary: item.description_secondary,
      price: item.price,
      image_url: null,
      is_available: item.is_available,
      sort_order: (last?.sort_order ?? -1) + 1,
    })
    .select("id")
    .single();
  if (error || !copy) return { ok: false, error: error?.message ?? t.menu.itemNotFound };

  // Clone option groups and, under each, its options.
  const { data: groups } = await supabase
    .from("option_groups")
    .select("id, name, is_required, max_select")
    .eq("item_id", id);

  for (const group of groups ?? []) {
    const { data: newGroup } = await supabase
      .from("option_groups")
      .insert({
        item_id: copy.id,
        name: group.name,
        is_required: group.is_required,
        max_select: group.max_select,
      })
      .select("id")
      .single();
    if (!newGroup) continue;

    const { data: options } = await supabase
      .from("options")
      .select("name, price_delta")
      .eq("group_id", group.id);
    if (options?.length) {
      await supabase.from("options").insert(
        options.map((option) => ({
          group_id: newGroup.id,
          name: option.name,
          price_delta: option.price_delta,
        }))
      );
    }
  }

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
