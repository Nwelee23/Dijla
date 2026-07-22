"use server";

import { revalidatePath } from "next/cache";

import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Owner resubmits a rejected restaurant for review (AUTH_UI_SPEC §6). Runs as
 * the owner (not service_role): the guard trigger (0022) permits exactly the
 * rejected -> pending transition for them and nothing else, and the
 * `.eq("verification_status", "rejected")` filter makes that the only case this
 * touches. An owner can never move themselves to 'verified' this way.
 */
export async function resubmitVerification(): Promise<{
  ok: boolean;
  error?: string;
}> {
  const t = await getT();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const { data: profile } = await supabase
    .from("profiles")
    .select("restaurant_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.restaurant_id) return { ok: false };

  const { error } = await supabase
    .from("restaurants")
    .update({ verification_status: "pending" })
    .eq("id", profile.restaurant_id)
    .eq("verification_status", "rejected");

  if (error) return { ok: false, error: t.admin.updateFailed };

  revalidatePath("/", "layout");
  return { ok: true };
}
