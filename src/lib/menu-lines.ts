/**
 * Parse a pasted menu — one dish per line, price at the end
 * (REDESIGN_V2_SPEC §7.4). "كباب عراقي 12000" → { name: "كباب عراقي", price: 12000 }.
 *
 * The fastest way to build a menu is to paste one the owner already has typed in
 * a notes app, so this is forgiving: Arabic-Indic and Persian digits are
 * accepted, and thousands separators (٫ , .) are stripped. A line with no
 * trailing number is reported as unparsed rather than silently dropped.
 */

export type ParsedLine = { name: string; price: number };

/** Fold Arabic-Indic (٠-٩) and Persian (۰-۹) digits to ASCII. */
function normalizeDigits(input: string): string {
  return input
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

/** One line → a dish, or null when there is no usable name + price. */
export function parseMenuLine(raw: string): ParsedLine | null {
  const line = normalizeDigits(raw).trim();
  if (!line) return null;

  // Name, then optional separators, then the trailing number.
  const match = line.match(/^(.*?)[\s\-–—:.]*([0-9][0-9.,]*)\s*$/);
  if (!match) return null;

  const name = match[1].trim();
  const price = Number(match[2].replace(/[.,]/g, ""));
  if (!name || !Number.isFinite(price) || price <= 0) return null;

  return { name, price };
}

export type ParsedLines = { valid: ParsedLine[]; invalid: number };

/** Parse a whole textarea. Blank lines are ignored, not counted as invalid. */
export function parseMenuLines(text: string): ParsedLines {
  let invalid = 0;
  const valid: ParsedLine[] = [];

  for (const raw of text.split("\n")) {
    if (!raw.trim()) continue;
    const parsed = parseMenuLine(raw);
    if (parsed) valid.push(parsed);
    else invalid += 1;
  }

  return { valid, invalid };
}

/** Cap on one paste, so a runaway paste can't insert thousands of rows. */
export const MAX_PASTE_LINES = 100;
