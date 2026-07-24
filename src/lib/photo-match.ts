/**
 * Match dropped photo files to menu items by filename similarity
 * (REDESIGN_V2_SPEC §7.2). Pure and unit-tested; the upload and the review UI
 * live in the component.
 *
 * A restaurant's photos are usually named after the dish ("kebab.jpg",
 * "كباب عراقي.png"), so a normalized comparison plus an edit-distance fallback
 * gets most of them right and the review step fixes the rest.
 */

export type MatchItem = { id: string; name: string };

/** Lowercase, drop the extension and punctuation, fold separators to spaces. */
export function normalizeName(input: string): string {
  return input
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, "") // extension
    .replace(/ـ/g, "") // Arabic tatweel
    .replace(/[_\-.]+/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ") // punctuation / symbols
    .replace(/\s+/g, " ")
    .trim();
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(
        prev[j] + 1,
        prev[j - 1] + 1,
        diag + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
      diag = tmp;
    }
  }
  return prev[n];
}

/** 0 (nothing alike) … 1 (identical), on already-normalized strings. */
export function similarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.85;
  const maxLen = Math.max(a.length, b.length);
  return 1 - levenshtein(a, b) / maxLen;
}

/**
 * The best-matching item id for each filename, or null when nothing clears the
 * threshold. Order matches the input filenames.
 */
export function matchFilesToItems(
  filenames: string[],
  items: MatchItem[],
  threshold = 0.5
): (string | null)[] {
  const normalized = items.map((item) => ({
    id: item.id,
    norm: normalizeName(item.name),
  }));

  return filenames.map((filename) => {
    const target = normalizeName(filename);
    let bestId: string | null = null;
    let bestScore = threshold;
    for (const item of normalized) {
      const score = similarity(target, item.norm);
      if (score >= bestScore) {
        bestScore = score;
        bestId = item.id;
      }
    }
    return bestId;
  });
}
