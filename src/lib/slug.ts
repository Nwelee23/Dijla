/**
 * Slug generation for restaurant URLs (`/r/[slug]`).
 *
 * Restaurant names are Arabic, but an Arabic slug percent-encodes into an
 * unreadable URL — `/r/%D9%85%D8%B7%D8%B9%D9%85...` — which is useless on a
 * printed QR card or in a WhatsApp message. So transliterate to Latin.
 */

const ARABIC_TO_LATIN: Record<string, string> = {
  ا: "a", أ: "a", إ: "i", آ: "a", ٱ: "a",
  ب: "b", ت: "t", ث: "th", ج: "j", ح: "h", خ: "kh",
  د: "d", ذ: "th", ر: "r", ز: "z", س: "s", ش: "sh",
  ص: "s", ض: "d", ط: "t", ظ: "z", ع: "a", غ: "gh",
  ف: "f", ق: "q", ك: "k", ل: "l", م: "m", ن: "n",
  ه: "h", ة: "a", و: "w", ي: "y", ى: "a", ئ: "e", ء: "a", ؤ: "o",
  // Persian/Kurdish letters that show up in Iraqi names
  پ: "p", چ: "ch", ژ: "zh", گ: "g",
  // Arabic-Indic digits
  "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
  "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
};

/** Arabic diacritics and tatweel — dropped, they carry no slug value. */
const DIACRITICS = /[ً-ٰٟـ]/g;

export function slugify(input: string): string {
  const transliterated = input
    .trim()
    .toLowerCase()
    .replace(DIACRITICS, "")
    .split("")
    .map((char) => ARABIC_TO_LATIN[char] ?? char)
    .join("");

  const slug = transliterated
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/g, "");

  // A name of only unmapped characters can slugify to nothing.
  return slug || `restaurant-${Math.random().toString(36).slice(2, 8)}`;
}
