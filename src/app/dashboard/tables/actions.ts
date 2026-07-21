"use server";

import { revalidatePath } from "next/cache";

import { getT } from "@/lib/i18n/server";
import { generateQrToken } from "@/lib/qr";
import { getRestaurant } from "@/lib/restaurant";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { ok: true } | { ok: false; error: string };

const TABLES_PATH = "/dashboard/tables";

/** qr_token is UNIQUE platform-wide, so a collision is possible in principle. */
const MAX_TOKEN_ATTEMPTS = 5;

export async function createTable(
  tableNumber: string,
  label: string
): Promise<ActionResult> {
  const t = await getT();
  const number = tableNumber.trim();
  if (!number) return { ok: false, error: t.tables.numberRequired };

  const restaurant = await getRestaurant();
  if (!restaurant) return { ok: false, error: t.onboarding.restaurantNotFound };

  const supabase = await createClient();

  // Two tables in one restaurant sharing a number means staff carry an order to
  // the wrong one. The DB has no constraint for it, so check here.
  const { data: clash } = await supabase
    .from("tables")
    .select("id")
    .eq("table_number", number)
    .maybeSingle();

  if (clash) return { ok: false, error: t.tables.numberTaken };

  for (let attempt = 0; attempt < MAX_TOKEN_ATTEMPTS; attempt++) {
    const { error } = await supabase.from("tables").insert({
      restaurant_id: restaurant.id,
      table_number: number,
      label: label.trim() || null,
      qr_token: generateQrToken(),
    });

    if (!error) {
      revalidatePath(TABLES_PATH);
      return { ok: true };
    }

    // 23505 on qr_token: astronomically unlikely, but retry rather than show
    // the owner a database error they can do nothing about.
    if (error.code !== "23505") return { ok: false, error: error.message };
  }

  return { ok: false, error: t.tables.tokenFailed };
}

export async function updateTable(
  id: string,
  tableNumber: string,
  label: string
): Promise<ActionResult> {
  const t = await getT();
  const number = tableNumber.trim();
  if (!number) return { ok: false, error: t.tables.numberRequired };

  const supabase = await createClient();

  const { data: clash } = await supabase
    .from("tables")
    .select("id")
    .eq("table_number", number)
    .neq("id", id)
    .maybeSingle();

  if (clash) return { ok: false, error: t.tables.numberTaken };

  const { error } = await supabase
    .from("tables")
    .update({ table_number: number, label: label.trim() || null })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath(TABLES_PATH);
  return { ok: true };
}

export async function setTableActive(
  id: string,
  isActive: boolean
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("tables")
    .update({ is_active: isActive })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath(TABLES_PATH);
  return { ok: true };
}

export async function deleteTable(id: string): Promise<ActionResult> {
  const t = await getT();
  const supabase = await createClient();

  const { error } = await supabase.from("tables").delete().eq("id", id);

  if (error) {
    // orders.table_id has no ON DELETE, so a table that has ever been ordered
    // from cannot be removed without orphaning that history.
    if (error.code === "23503") {
      return { ok: false, error: t.tables.cannotDeleteWithOrders };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath(TABLES_PATH);
  return { ok: true };
}

/**
 * Issues a fresh token, which invalidates every printed copy of the old QR.
 * For when a sticker is photographed and abused, or a table is moved outside.
 */
export async function regenerateQrToken(id: string): Promise<ActionResult> {
  const t = await getT();
  const supabase = await createClient();

  for (let attempt = 0; attempt < MAX_TOKEN_ATTEMPTS; attempt++) {
    const { error } = await supabase
      .from("tables")
      .update({ qr_token: generateQrToken() })
      .eq("id", id);

    if (!error) {
      revalidatePath(TABLES_PATH);
      return { ok: true };
    }
    if (error.code !== "23505") return { ok: false, error: error.message };
  }

  return { ok: false, error: t.tables.tokenFailed };
}
