"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { LOCALE_COOKIE, isLocale } from "@/lib/i18n/config";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/** Remembers the staff member's language choice. */
export async function setLocale(value: string) {
  if (!isLocale(value)) return;

  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, value, {
    maxAge: ONE_YEAR_SECONDS,
    path: "/",
    sameSite: "lax",
    // Readable by the client is fine — a language preference is not a secret,
    // and it must survive without a round-trip on the customer pages.
    httpOnly: false,
  });

  // The whole tree is translated, so every layout and page must re-render.
  revalidatePath("/", "layout");
}
