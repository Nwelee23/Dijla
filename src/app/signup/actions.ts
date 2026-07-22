"use server";

import { revalidatePath } from "next/cache";

import { MIN_PASSWORD_LENGTH } from "@/lib/auth/password";
import { normalizeIraqiPhone } from "@/lib/auth/phone";
import { isValidUsername, normalizeUsername } from "@/lib/auth/username";
import { isPlausibleIraqPin } from "@/lib/geo";
import { getT } from "@/lib/i18n/server";
import { isRestaurantTypeKey } from "@/lib/restaurant-types";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/slug";

export type SignupResult =
  | { ok: true; restaurantId: string; slug: string }
  | { ok: false; error: string };

export type CompleteSignupInput = {
  ownerName: string;
  ownerPhone: string;
  username: string;
  password: string;
  restaurantName: string;
  restaurantType: string;
  restaurantPhone: string;
  area: string;
  district: string;
  landmark: string;
  lat: number | null;
  lng: number | null;
};

/**
 * Final signup submit (AUTH_UI_SPEC §3.4). The caller is already a verified,
 * signed-in user (the email OTP in step 1 created and confirmed the account).
 * This creates the restaurant + owner profile atomically via
 * create_restaurant_with_owner (0003), sets the password chosen in step 1, and
 * fills the extra profile/restaurant fields. The restaurant lands in the default
 * `pending` verification state. Documents upload separately, once the restaurant
 * id (and folder) exist.
 */
export async function completeSignup(
  input: CompleteSignupInput
): Promise<SignupResult> {
  const t = await getT();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: t.auth.loginFailed };

  const username = normalizeUsername(input.username);
  if (!isValidUsername(username)) {
    return { ok: false, error: t.signup.usernameInvalid };
  }
  if (input.password.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, error: t.auth.passwordTooShort };
  }
  const name = input.restaurantName.trim();
  if (name.length < 2) return { ok: false, error: t.onboarding.nameTooShort };
  if (!input.restaurantType || !isRestaurantTypeKey(input.restaurantType)) {
    return { ok: false, error: t.signup.typeRequired };
  }
  if (!input.district.trim() || !input.landmark.trim()) {
    return { ok: false, error: t.signup.locationRequired };
  }
  // The pin is the whole point of the informal-address model — require a real
  // one inside Iraq, not an IP-geolocated guess from another country.
  if (
    input.lat == null ||
    input.lng == null ||
    !isPlausibleIraqPin(input.lat, input.lng)
  ) {
    return { ok: false, error: t.signup.pinRequired };
  }

  let restaurantPhone: string | undefined;
  if (input.restaurantPhone.trim()) {
    const normalized = normalizeIraqiPhone(input.restaurantPhone);
    if (!normalized) return { ok: false, error: t.auth.invalidPhone };
    restaurantPhone = normalized;
  }
  let ownerPhone: string | null = null;
  if (input.ownerPhone.trim()) {
    ownerPhone = normalizeIraqiPhone(input.ownerPhone);
    if (!ownerPhone) return { ok: false, error: t.auth.invalidPhone };
  }

  // Friendly pre-check; the unique index is the real guard against a race.
  const { data: taken } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .neq("id", user.id)
    .maybeSingle();
  if (taken) return { ok: false, error: t.signup.usernameTaken };

  const slug = slugify(input.restaurantName);
  const { data: restaurantId, error } = await supabase.rpc(
    "create_restaurant_with_owner",
    {
      p_name: name,
      p_slug: slug,
      p_phone: restaurantPhone,
      p_area: input.area.trim() || undefined,
      p_full_name: input.ownerName.trim() || undefined,
    }
  );

  if (error || !restaurantId) {
    if (error?.code === "23505") {
      return { ok: false, error: t.onboarding.alreadyOnboarded };
    }
    return { ok: false, error: error?.message ?? t.admin.updateFailed };
  }

  // Set the chosen password (step 1 only verified the email via OTP).
  await supabase.auth.updateUser({ password: input.password });

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ username, phone: ownerPhone, phone_verified: false })
    .eq("id", user.id);
  if (profileError?.code === "23505") {
    return { ok: false, error: t.signup.usernameTaken };
  }

  await supabase
    .from("restaurants")
    .update({
      restaurant_type: input.restaurantType,
      district: input.district.trim(),
      landmark: input.landmark.trim(),
      lat: input.lat,
      lng: input.lng,
    })
    .eq("id", restaurantId);

  revalidatePath("/", "layout");
  return { ok: true, restaurantId, slug };
}

/**
 * Records the uploaded document paths (not URLs — the bucket is private, so
 * viewing goes through short-lived signed URLs later). Called after the files
 * land in verification-docs/<restaurant_id>/.
 */
export async function setVerificationDocs(
  idDocumentPath: string,
  licensePath: string | null
): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  await supabase
    .from("profiles")
    .update({ id_document_url: idDocumentPath })
    .eq("id", user.id);

  if (licensePath) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("restaurant_id")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.restaurant_id) {
      await supabase
        .from("restaurants")
        .update({ license_document_url: licensePath })
        .eq("id", profile.restaurant_id);
    }
  }

  revalidatePath("/", "layout");
  return { ok: true };
}
