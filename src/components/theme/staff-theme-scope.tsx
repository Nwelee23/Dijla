"use client";

import { useDashboardTheme } from "@/lib/hooks/use-dashboard-theme";
import { cn } from "@/lib/utils";

/**
 * Pins the staff surfaces (dashboard, driver, admin) to their own theme.
 *
 * The class is written out explicitly as `dark` *or* `light` — never "the
 * absence of dark" — because the document root carries the public preference,
 * which may be the opposite. Both classes fully declare the token set, so this
 * subtree wins over whatever the root says.
 *
 * `dj-dashboard` no longer tints anything; it only marks the subtree for the
 * print reset, so a QR or cash sheet prints as dark ink on white paper.
 */
export function StaffThemeScope({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const { theme } = useDashboardTheme();

  return (
    <div
      className={cn(
        theme,
        "dj-dashboard bg-background text-foreground",
        className
      )}
    >
      {children}
    </div>
  );
}
