"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/admin";
import { getT } from "@/lib/i18n/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type AdminResult = { ok: true } | { ok: false; error: string };

/**
 * Record an outreach note against a churn-risk restaurant (§A.3), so the same
 * one isn't chased twice. Inserted through the admin's own session — the
 * admin_only_outreach RLS policy (0032) is the fence, and created_by is set to
 * the caller.
 */
export async function logOutreach(
  restaurantId: string,
  note: string
): Promise<AdminResult> {
  const t = await getT();
  if (!(await requireAdmin())) return { ok: false, error: t.admin.notAllowed };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("admin_outreach").insert({
    restaurant_id: restaurantId,
    note: note.trim() || null,
    created_by: user?.id ?? null,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin");
  return { ok: true };
}

const TIERS = ["basic", "pro"] as const;
const STATUSES = ["trial", "active", "past_due", "cancelled"] as const;

/** How long a document's signed URL stays valid — long enough to open, not to share. */
const DOC_URL_TTL_SECONDS = 300;

export type VerificationDetails = {
  ownerName: string | null;
  phone: string | null;
  phoneVerified: boolean;
  restaurantType: string | null;
  area: string | null;
  district: string | null;
  landmark: string | null;
  createdAt: string | null;
  menuItemCount: number;
  idDocUrl: string | null;
  licenseDocUrl: string | null;
};

/**
 * Everything an admin needs to judge a pending restaurant (§C.4): owner details,
 * the landmark, a genuine-intent signal (signup age + how many menu items they
 * built), and the identity/licence documents as SHORT-LIVED SIGNED URLs from the
 * private verification-docs bucket — never public URLs. Admin-gated; the docs
 * columns hold storage paths, signed here with the service-role client.
 */
export async function getVerificationDetails(
  restaurantId: string
): Promise<{ ok: true; details: VerificationDetails } | { ok: false; error: string }> {
  const t = await getT();
  if (!(await requireAdmin())) return { ok: false, error: t.admin.notAllowed };

  const admin = createAdminClient();
  const { data: restaurant } = await admin
    .from("restaurants")
    .select("area, district, landmark, restaurant_type, created_at, license_document_url")
    .eq("id", restaurantId)
    .maybeSingle();
  if (!restaurant) return { ok: false, error: t.admin.updateFailed };

  const { data: owner } = await admin
    .from("profiles")
    .select("full_name, phone, phone_verified, id_document_url")
    .eq("restaurant_id", restaurantId)
    .eq("role", "owner")
    .maybeSingle();

  const { count } = await admin
    .from("menu_items")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", restaurantId);

  const sign = async (path: string | null | undefined) => {
    if (!path) return null;
    const { data } = await admin.storage
      .from("verification-docs")
      .createSignedUrl(path, DOC_URL_TTL_SECONDS);
    return data?.signedUrl ?? null;
  };

  return {
    ok: true,
    details: {
      ownerName: owner?.full_name ?? null,
      phone: owner?.phone ?? null,
      phoneVerified: owner?.phone_verified ?? false,
      restaurantType: restaurant.restaurant_type,
      area: restaurant.area,
      district: restaurant.district,
      landmark: restaurant.landmark,
      createdAt: restaurant.created_at,
      menuItemCount: count ?? 0,
      idDocUrl: await sign(owner?.id_document_url),
      licenseDocUrl: await sign(restaurant.license_document_url),
    },
  };
}

/** Suspend or reactivate a whole restaurant. */
export async function setRestaurantActive(
  restaurantId: string,
  active: boolean
): Promise<AdminResult> {
  const t = await getT();
  if (!(await requireAdmin())) return { ok: false, error: t.admin.notAllowed };

  const admin = createAdminClient();
  const { error } = await admin
    .from("restaurants")
    .update({ is_active: active })
    .eq("id", restaurantId);

  if (error) return { ok: false, error: t.admin.updateFailed };

  revalidatePath("/admin");
  return { ok: true };
}

const VERIFICATION_STATUSES = ["pending", "verified", "rejected"] as const;

/**
 * Verify or reject a restaurant (AUTH_UI_SPEC §6). The service-role client is
 * the trusted path the guard trigger (0022) allows to set these fields — an
 * owner cannot self-verify. A rejection carries a reason the owner then sees;
 * verifying stamps verified_at and clears any stale note.
 */
export async function setVerification(
  restaurantId: string,
  status: "verified" | "rejected" | "pending",
  note: string | null
): Promise<AdminResult> {
  const t = await getT();
  if (!(await requireAdmin())) return { ok: false, error: t.admin.notAllowed };
  if (!VERIFICATION_STATUSES.includes(status)) {
    return { ok: false, error: t.admin.updateFailed };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("restaurants")
    .update({
      verification_status: status,
      verified_at: status === "verified" ? new Date().toISOString() : null,
      verification_note: status === "rejected" ? note?.trim() || null : null,
    })
    .eq("id", restaurantId);

  if (error) return { ok: false, error: t.admin.updateFailed };

  revalidatePath("/admin");
  return { ok: true };
}

/**
 * Set a restaurant's subscription: tier, status and the trial/period dates.
 *
 * Activation is manual for now — no payment gateway — so this is where "who
 * paid" is recorded. Upserts on restaurant_id (unique per 0009), so a
 * restaurant that somehow has no row still gets one rather than silently
 * failing.
 */
export async function setSubscription(
  restaurantId: string,
  input: {
    tier: string;
    status: string;
    amount: number | null;
    startDate: string | null;
    endDate: string | null;
    cancellationReason: string | null;
  }
): Promise<AdminResult> {
  const t = await getT();
  if (!(await requireAdmin())) return { ok: false, error: t.admin.notAllowed };

  if (!TIERS.includes(input.tier as (typeof TIERS)[number])) {
    return { ok: false, error: t.admin.updateFailed };
  }
  if (!STATUSES.includes(input.status as (typeof STATUSES)[number])) {
    return { ok: false, error: t.admin.updateFailed };
  }
  // The monthly price feeds MRR; a negative is a typo, not a credit.
  if (input.amount !== null && (!Number.isFinite(input.amount) || input.amount < 0)) {
    return { ok: false, error: t.admin.updateFailed };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("subscriptions").upsert(
    {
      restaurant_id: restaurantId,
      tier: input.tier,
      status: input.status,
      amount: input.amount,
      start_date: input.startDate || null,
      end_date: input.endDate || null,
      // Only meaningful on a cancellation; cleared otherwise so a reason from a
      // past churn does not linger on a resubscribed restaurant.
      cancellation_reason:
        input.status === "cancelled" ? input.cancellationReason || null : null,
    },
    { onConflict: "restaurant_id" }
  );

  if (error) return { ok: false, error: t.admin.updateFailed };

  revalidatePath("/admin");
  return { ok: true };
}
