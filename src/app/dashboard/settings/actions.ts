"use server";

import { revalidatePath } from "next/cache";

import { normalizeIraqiPhone } from "@/lib/auth/phone";
import { getRestaurant } from "@/lib/restaurant";
import { slugify } from "@/lib/slug";
import { createClient } from "@/lib/supabase/server";
import { validateHours, type OpeningHours } from "@/lib/hours";

export type ActionResult = { ok: true } | { ok: false; error: string };

export type ProfileInput = {
  name: string;
  slug: string;
  phone: string;
  area: string;
  logoUrl: string | null;
  deliveryFee: number;
};

/** Revalidate the layout too: the header carries the name and logo. */
function revalidate() {
  revalidatePath("/dashboard", "layout");
}

export async function updateRestaurantProfile(
  input: ProfileInput
): Promise<ActionResult> {
  const name = input.name.trim();
  if (name.length < 2) return { ok: false, error: "اسم المطعم قصير جداً." };

  const slug = slugify(input.slug.trim() || name);

  let phone: string | null = null;
  if (input.phone.trim()) {
    phone = normalizeIraqiPhone(input.phone);
    if (!phone) {
      return { ok: false, error: "رقم الهاتف غير صحيح. مثال: 07701234567" };
    }
  }

  if (!Number.isFinite(input.deliveryFee) || input.deliveryFee < 0) {
    return { ok: false, error: "رسوم التوصيل غير صحيحة." };
  }

  const restaurant = await getRestaurant();
  if (!restaurant) return { ok: false, error: "لم يتم العثور على المطعم." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("restaurants")
    .update({
      name,
      slug,
      phone,
      area: input.area.trim() || null,
      logo_url: input.logoUrl,
      delivery_fee: input.deliveryFee,
    })
    .eq("id", restaurant.id);

  if (error) {
    // slug is UNIQUE across the whole platform, not just this tenant.
    if (error.code === "23505") {
      return {
        ok: false,
        error: "هذا الرابط مستخدم من مطعم آخر. جرّب رابطاً مختلفاً.",
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

export async function updateOpeningHours(
  hours: OpeningHours
): Promise<ActionResult> {
  const invalid = validateHours(hours);
  if (invalid) return { ok: false, error: invalid };

  const restaurant = await getRestaurant();
  if (!restaurant) return { ok: false, error: "لم يتم العثور على المطعم." };

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
