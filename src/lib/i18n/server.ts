import "server-only";

import { cache } from "react";
import { cookies, headers } from "next/headers";

import { DEFAULT_LOCALE, LOCALE_COOKIE, LOCALES, isLocale, type Locale } from "./config";
import { getDictionary } from "./index";

/**
 * The active locale for this request.
 *
 * Cookie first (an explicit choice by staff), then the browser's Accept-Language
 * so a first-time visitor gets something sensible, then Arabic.
 */
export const getLocale = cache(async (): Promise<Locale> => {
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie)) return fromCookie;

  const headerList = await headers();
  const accept = headerList.get("accept-language");
  if (accept) {
    for (const part of accept.split(",")) {
      // "ckb-IQ;q=0.9" -> "ckb"
      const tag = part.split(";")[0]?.trim().toLowerCase();
      const base = tag?.split("-")[0];
      const match = LOCALES.find((locale) => locale === tag || locale === base);
      if (match) return match;
    }
  }

  return DEFAULT_LOCALE;
});

/** The dictionary for this request. Server Components and Server Actions. */
export const getT = cache(async () => getDictionary(await getLocale()));
