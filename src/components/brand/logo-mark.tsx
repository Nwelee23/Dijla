/**
 * The Dijla mark — a flowing river line above a bowl, the Tigris meeting the
 * plate (REDESIGN_V2_SPEC §3). Chosen to stay legible at favicon size.
 *
 * Two variants:
 * - `tile`  — the mark on a rounded emerald tile, for light/neutral surfaces.
 * - `plain` — just the ripple and bowl in `currentColor`, transparent behind,
 *             for placing on an already-coloured surface.
 *
 * Colours come from tokens (--brand / --brand-foreground), so the one mark
 * recolours with the theme instead of shipping a baked-in hex. The spec sketched
 * it with --accent/--accent-fg; in this repo the brand emerald is --brand.
 */
export function LogoMark({
  variant = "tile",
  className,
  title = "دجلة",
}: {
  variant?: "tile" | "plain";
  className?: string;
  title?: string;
}) {
  const ink = variant === "tile" ? "var(--brand-foreground)" : "currentColor";

  return (
    <svg
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title}
      className={className}
    >
      {variant === "tile" && (
        <rect width="100" height="100" rx="24" fill="var(--brand)" />
      )}
      {/* the river ripple, riding above the bowl */}
      <path
        d="M26 44c9-7 14 4 24 0s15-8 24-1"
        stroke={ink}
        strokeWidth="5.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.55"
      />
      {/* the bowl */}
      <path d="M24 56c0 12 11 20 26 20s26-8 26-20z" fill={ink} />
    </svg>
  );
}
