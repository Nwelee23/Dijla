"use server";

import { revalidatePath } from "next/cache";

import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

import type { ActionResult } from "./actions";

const MENU_PATH = "/dashboard/menu";

/**
 * Option groups and options (MENU_BUILDER_SPEC §4) map to option_groups /
 * options. A group has a name, is_required, and max_select (1 = single choice
 * like الحجم; >1 = multi like الإضافات); each option carries a price_delta.
 * Every write is scoped by RLS through the item→restaurant join (0002), so a
 * forged id simply matches no row. Options cascade-delete with their group.
 */

export async function addOptionGroup(
  itemId: string,
  name: string
): Promise<ActionResult> {
  const t = await getT();
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: t.menu.groupNameRequired };

  const supabase = await createClient();
  const { error } = await supabase.from("option_groups").insert({
    item_id: itemId,
    name: trimmed,
    is_required: false,
    max_select: 1,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath(MENU_PATH);
  return { ok: true };
}

export async function updateOptionGroup(
  id: string,
  input: { name: string; isRequired: boolean; maxSelect: number }
): Promise<ActionResult> {
  const t = await getT();
  const trimmed = input.name.trim();
  if (!trimmed) return { ok: false, error: t.menu.groupNameRequired };

  const supabase = await createClient();
  const { error } = await supabase
    .from("option_groups")
    .update({
      name: trimmed,
      is_required: input.isRequired,
      max_select: input.maxSelect < 1 ? 1 : Math.floor(input.maxSelect),
    })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath(MENU_PATH);
  return { ok: true };
}

export async function deleteOptionGroup(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("option_groups").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath(MENU_PATH);
  return { ok: true };
}

export async function addOption(
  groupId: string,
  name: string,
  priceDelta: number
): Promise<ActionResult> {
  const t = await getT();
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: t.menu.optionNameRequired };
  if (!Number.isFinite(priceDelta)) {
    return { ok: false, error: t.menu.invalidPrice };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("options").insert({
    group_id: groupId,
    name: trimmed,
    price_delta: priceDelta,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath(MENU_PATH);
  return { ok: true };
}

export async function updateOption(
  id: string,
  input: { name: string; priceDelta: number }
): Promise<ActionResult> {
  const t = await getT();
  const trimmed = input.name.trim();
  if (!trimmed) return { ok: false, error: t.menu.optionNameRequired };
  if (!Number.isFinite(input.priceDelta)) {
    return { ok: false, error: t.menu.invalidPrice };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("options")
    .update({ name: trimmed, price_delta: input.priceDelta })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath(MENU_PATH);
  return { ok: true };
}

export async function deleteOption(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("options").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath(MENU_PATH);
  return { ok: true };
}
