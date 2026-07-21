import type { ar } from "./dictionaries/ar";

/** Recursively widens the `as const` literals so translations can differ. */
type Widen<T> = T extends string
  ? string
  : { [K in keyof T]: Widen<T[K]> };

/**
 * Every dictionary must match Arabic exactly. A key added to `ar.ts` and
 * forgotten elsewhere is a build error, not a blank label discovered by a
 * restaurant owner in Erbil.
 */
export type Dictionary = Widen<typeof ar>;
