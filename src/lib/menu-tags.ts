/**
 * The known set of owner-assignable menu tags (REDESIGN_V2_SPEC §5).
 *
 * Tags are stored as free-form `text[]` in the database, but validated here
 * against this closed set both when saving (so a typo can't create a ghost
 * filter) and when reading (so a stale value never renders). Labels are looked
 * up in the dictionaries under `menu.tags`.
 *
 * These are qualities a person sets by hand. "Most ordered" and "new" are
 * derived from data (order counts, created_at), not stored here.
 */
export const MENU_TAGS = ["vegetarian", "spicy", "chef_choice"] as const;

export type MenuTag = (typeof MENU_TAGS)[number];

export function isMenuTag(value: string): value is MenuTag {
  return (MENU_TAGS as readonly string[]).includes(value);
}

/** Keep only known tags, de-duplicated, in the canonical order. */
export function sanitizeTags(tags: readonly string[]): MenuTag[] {
  const present = new Set(tags);
  return MENU_TAGS.filter((tag) => present.has(tag));
}

/** How high a prep-time estimate we accept, in minutes. */
export const MAX_PREP_MINUTES = 240;
