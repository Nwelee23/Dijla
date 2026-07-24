"use server";

import { revalidatePath } from "next/cache";

import { getT } from "@/lib/i18n/server";
import type { Dictionary } from "@/lib/i18n";
import { MAX_PASTE_LINES, type ParsedLine } from "@/lib/menu-lines";
import { MAX_PREP_MINUTES, sanitizeTags } from "@/lib/menu-tags";
import { createClient } from "@/lib/supabase/server";
import { getRestaurant } from "@/lib/restaurant";

import type { ActionResult } from "./actions";

const MENU_PATH = "/dashboard/menu";
const BUCKET = "menu-images";

export type ItemInput = {
  name: string;
  /** English name (name_secondary) + description, and Persian name/description (§10). */
  nameSecondary: string;
  descriptionSecondary: string;
  nameFa: string;
  descriptionFa: string;
  description: string;
  price: number;
  imageUrl: string | null;
  categoryId: string | null;
  /** Owner-assignable labels; validated against the known set server-side. */
  tags: string[];
  /** Prep estimate in minutes, or null. */
  prepMinutes: number | null;
  /** false = "نفد بشكل دائم" — do not auto-restore next service day (§6). */
  autoRestore: boolean;
  /** Optional cost for margin reporting; never shown to customers (§B.5). */
  cost: number | null;
};

/** Trim to null so an empty translation field clears the column. */
function orNull(value: string): string | null {
  return value.trim() || null;
}

/** A cost of 0 or blank clears it; negatives are rejected. */
function cleanCost(value: number | null): number | null {
  if (value === null || !Number.isFinite(value) || value <= 0) return null;
  return value;
}

/** Clamp the prep estimate to a sane range, or null it out. */
function cleanPrep(value: number | null): number | null {
  if (value === null || !Number.isFinite(value) || value <= 0) return null;
  return Math.min(Math.round(value), MAX_PREP_MINUTES);
}

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
    name_secondary: orNull(input.nameSecondary),
    name_fa: orNull(input.nameFa),
    description: orNull(input.description),
    description_secondary: orNull(input.descriptionSecondary),
    description_fa: orNull(input.descriptionFa),
    price: input.price,
    image_url: input.imageUrl,
    tags: sanitizeTags(input.tags),
    prep_minutes: cleanPrep(input.prepMinutes),
    auto_restore: input.autoRestore,
    cost: cleanCost(input.cost),
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
      name_secondary: orNull(input.nameSecondary),
      name_fa: orNull(input.nameFa),
      description: orNull(input.description),
      description_secondary: orNull(input.descriptionSecondary),
      description_fa: orNull(input.descriptionFa),
      price: input.price,
      image_url: input.imageUrl,
      tags: sanitizeTags(input.tags),
      prep_minutes: cleanPrep(input.prepMinutes),
      auto_restore: input.autoRestore,
      cost: cleanCost(input.cost),
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

/**
 * Bulk-create items from pasted lines (§7.4). Only name + price — the fast path
 * for getting a whole menu in, with photos and options added later. Appended in
 * order within the category; capped so a runaway paste can't flood the menu.
 */
export async function createItemsFromLines(
  categoryId: string | null,
  lines: ParsedLine[]
): Promise<ActionResult> {
  const t = await getT();

  const clean = lines
    .map((line) => ({ name: line.name.trim(), price: line.price }))
    .filter((line) => line.name && Number.isFinite(line.price) && line.price > 0)
    .slice(0, MAX_PASTE_LINES);

  if (clean.length === 0) return { ok: false, error: t.menu.pasteNoLines };

  const restaurant = await getRestaurant();
  if (!restaurant) return { ok: false, error: t.onboarding.restaurantNotFound };

  const supabase = await createClient();

  const { data: last } = await supabase
    .from("menu_items")
    .select("sort_order")
    .eq("category_id", categoryId ?? "")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  let sort = (last?.sort_order ?? -1) + 1;
  const rows = clean.map((line) => ({
    restaurant_id: restaurant.id,
    category_id: categoryId,
    name: line.name,
    price: line.price,
    sort_order: sort++,
  }));

  const { error } = await supabase.from("menu_items").insert(rows);
  if (error) return { ok: false, error: error.message };

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
    .update({
      is_available: isAvailable,
      // Stamp when it went out so auto-restore knows which service day it was,
      // and clear it the moment it comes back.
      sold_out_at: isAvailable ? null : new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath(MENU_PATH);
  return { ok: true };
}

/**
 * Attach a photo to one item (used by the bulk photo drop, §7.2). Cleans up a
 * replaced image so bulk-attaching over existing photos doesn't leak storage —
 * the same care updateItem takes.
 */
export async function setItemImage(
  id: string,
  url: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("menu_items")
    .select("image_url")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase
    .from("menu_items")
    .update({ image_url: url })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  if (existing?.image_url && existing.image_url !== url) {
    const path = storagePathFromUrl(existing.image_url);
    if (path) await supabase.storage.from(BUCKET).remove([path]);
  }

  revalidatePath(MENU_PATH);
  return { ok: true };
}

/**
 * Mark several items sold out (or available) at once (§6) — a rush sells the
 * last of three dishes at the same moment, and toggling them one by one loses
 * the race. RLS scopes the update to the caller's own restaurant.
 */
export async function setItemsAvailable(
  ids: string[],
  isAvailable: boolean
): Promise<ActionResult> {
  if (ids.length === 0) return { ok: true };

  const supabase = await createClient();
  const { error } = await supabase
    .from("menu_items")
    .update({
      is_available: isAvailable,
      sold_out_at: isAvailable ? null : new Date().toISOString(),
    })
    .in("id", ids);

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
      name_fa: item.name_fa,
      description: item.description,
      description_secondary: item.description_secondary,
      description_fa: item.description_fa,
      price: item.price,
      image_url: null,
      tags: item.tags,
      prep_minutes: item.prep_minutes,
      auto_restore: item.auto_restore,
      cost: item.cost,
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
