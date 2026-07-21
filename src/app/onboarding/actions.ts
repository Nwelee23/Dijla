"use server";

import { revalidatePath } from "next/cache";

import { normalizeIraqiPhone } from "@/lib/auth/phone";
import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/slug";

export type OnboardingResult =
  | { ok: true; slug: string }
  | { ok: false; error: string };

export type OnboardingInput = {
  name: string;
  slug: string;
  phone: string;
  area: string;
  fullName: string;
};

/**
 * Creates the restaurant and the owner profile in one transaction via the
 * `create_restaurant_with_owner` function (see 0003_onboarding.sql).
 */
export async function createRestaurant(
  input: OnboardingInput
): Promise<OnboardingResult> {
  const t = await getT();
  const name = input.name.trim();
  if (name.length < 2) {
    return { ok: false, error: t.onboarding.nameTooShort };
  }

  // Trust the server's own slugify over whatever arrived from the browser.
  const slug = slugify(input.slug.trim() || name);

  let phone: string | null = null;
  if (input.phone.trim()) {
    phone = normalizeIraqiPhone(input.phone);
    if (!phone) {
      return { ok: false, error: t.auth.invalidPhone };
    }
  }

  const supabase = await createClient();
  // The SQL function defaults these to null, so omitting is the same as
  // passing null — and the generated types model them as optional, not nullable.
  const { error } = await supabase.rpc("create_restaurant_with_owner", {
    p_name: name,
    p_slug: slug,
    p_phone: phone ?? undefined,
    p_area: input.area.trim() || undefined,
    p_full_name: input.fullName.trim() || undefined,
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: t.onboarding.alreadyOnboarded };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/", "layout");
  return { ok: true, slug };
}
