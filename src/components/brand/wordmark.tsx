import Link from "next/link";

import { LogoMark } from "@/components/brand/logo-mark";
import { cn } from "@/lib/utils";

/**
 * The Dijla lockup: the mark beside «دجلة», with a small letter-spaced Latin
 * DIJLA beneath it (REDESIGN_V2_SPEC §3).
 *
 * A plain server component. Pass `href` to make the whole lockup a link (the
 * common case in a header); omit it for a static mark, e.g. inside a card.
 * `showLatin={false}` drops the sub-line where vertical room is tight.
 */
export function Wordmark({
  href,
  size = "md",
  showLatin = true,
  className,
}: {
  href?: string;
  size?: "sm" | "md" | "lg";
  showLatin?: boolean;
  className?: string;
}) {
  const mark = {
    sm: "size-8",
    md: "size-9",
    lg: "size-11",
  }[size];

  const name = {
    sm: "text-base",
    md: "text-lg",
    lg: "text-2xl",
  }[size];

  const content = (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoMark className={cn(mark, "shrink-0")} />
      <span className="flex flex-col leading-none">
        <span className={cn("font-bold", name)}>دجلة</span>
        {showLatin && (
          <span className="text-muted-foreground mt-1 text-[0.62rem] font-semibold tracking-[0.32em]">
            DIJLA
          </span>
        )}
      </span>
    </span>
  );

  if (!href) return content;

  return (
    <Link href={href} aria-label="دجلة" className="inline-flex">
      {content}
    </Link>
  );
}
