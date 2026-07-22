"use server";

import { revalidatePath } from "next/cache";

import { normalizeIraqiPhone } from "@/lib/auth/phone";
import { getRestaurant } from "@/lib/restaurant";
import { getSubscription } from "@/lib/subscription";
import { slugify } from "@/lib/slug";
import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { validateHours, type OpeningHours } from "@/lib/hours";
import { interpolate } from "@/lib/i18n";

export type ActionResult = { ok: true } | { ok: false; error: string };

export type ProfileInput = {
  name: string;
  slug: string;
  phone: string;
  area: string;
  logoUrl: string | null;
};

/** Revalidate the layout too: the header carries the name and logo. */
function revalidate() {
  revalidatePath("/dashboard", "layout");
}

export async function updateRestaurantProfile(
  input: ProfileInput
): Promise<ActionResult> {
  const t = await getT();
  const name = input.name.trim();
  if (name.length < 2) return { ok: false, error: t.onboarding.nameTooShort };

  const slug = slugify(input.slug.trim() || name);

  let phone: string | null = null;
  if (input.phone.trim()) {
    phone = normalizeIraqiPhone(input.phone);
    if (!phone) {
      return { ok: false, error: t.auth.invalidPhone };
    }
  }

  const restaurant = await getRestaurant();
  if (!restaurant) return { ok: false, error: t.onboarding.restaurantNotFound };

  const supabase = await createClient();
  const { error } = await supabase
    .from("restaurants")
    .update({
      name,
      slug,
      phone,
      area: input.area.trim() || null,
      logo_url: input.logoUrl,
    })
    .eq("id", restaurant.id);

  if (error) {
    // slug is UNIQUE across the whole platform, not just this tenant.
    if (error.code === "23505") {
      return {
        ok: false,
        error: t.settings.slugTaken,
      };
    }
    return { ok: false, error: error.message };
  }

  // Clean up a replaced logo so it doesn't sit in paid storage forever.
  if (restaurant.logo_url && restaurant.logo_url !== input.logoUrl) {
    const marker = "/storage/v1/object/public/menu-images/";
    const index = restaurant.logo_url.indexOf(marker);
    if (index !== -1) {
      await supabase.storage
        .from("menu-images")
        .remove([restaurant.logo_url.slice(index + marker.length)]);
    }
  }

  revalidate();
  return { ok: true };
}

export type DeliveryInput = {
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
  deliveryFee: number;
  minOrder: number;
};

/**
 * The channels a public link offers, and what they cost.
 *
 * Both switches may be off at once: a dine-in-only restaurant still wants a
 * `/r/[slug]` link to show its menu, it just does not want anyone posting an
 * order it has nobody to fulfil. That is a valid configuration, not an error.
 */
export async function updateDeliverySettings(
  input: DeliveryInput
): Promise<ActionResult> {
  const t = await getT();

  if (!Number.isFinite(input.deliveryFee) || input.deliveryFee < 0) {
    return { ok: false, error: t.settings.invalidDeliveryFee };
  }
  if (!Number.isFinite(input.minOrder) || input.minOrder < 0) {
    return { ok: false, error: t.settings.invalidMinOrder };
  }

  const restaurant = await getRestaurant();
  if (!restaurant) return { ok: false, error: t.onboarding.restaurantNotFound };

  // The card hides the switch, but the action is a POST endpoint like any other.
  // Refused rather than silently coerced to false: an owner who somehow got here
  // should be told delivery needs the pro tier, not quietly ignored.
  const plan = await getSubscription();
  if (input.deliveryEnabled && !plan.canUsePro) {
    return { ok: false, error: t.settings.deliveryNeedsPro };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("restaurants")
    .update({
      delivery_enabled: input.deliveryEnabled,
      pickup_enabled: input.pickupEnabled,
      delivery_fee: input.deliveryFee,
      min_order: input.minOrder,
    })
    .eq("id", restaurant.id);

  if (error) return { ok: false, error: error.message };

  // The public menu page reads these; without this it keeps offering a channel
  // the owner has just closed until the cache expires on its own.
  revalidatePath("/r/[slug]", "page");
  revalidate();
  return { ok: true };
}

export async function updateOpeningHours(
  hours: OpeningHours
): Promise<ActionResult> {
  const t = await getT();
  const invalid = validateHours(hours);
  if (invalid) {
    const day = t.days[invalid.day];
    const template =
      invalid.reason === "incomplete"
        ? t.settings.incompleteHours
        : t.settings.invalidTime;
    return { ok: false, error: interpolate(template, { day }) };
  }

  const restaurant = await getRestaurant();
  if (!restaurant) return { ok: false, error: t.onboarding.restaurantNotFound };

  const supabase = await createClient();

  // Merge rather than replace: `settings` is shared with future feature flags.
  const existing =
    restaurant.settings && typeof restaurant.settings === "object"
      ? (restaurant.settings as Record<string, unknown>)
      : {};

  const { error } = await supabase
    .from("restaurants")
    .update({ settings: { ...existing, hours } })
    .eq("id", restaurant.id);

  if (error) return { ok: false, error: error.message };

  revalidate();
  return { ok: true };
}
