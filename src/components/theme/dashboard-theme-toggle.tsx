"use client";

import { Moon, Sun } from "lucide-react";

import { useT } from "@/components/i18n/i18n-provider";
import { Button } from "@/components/ui/button";
import { useDashboardTheme } from "@/lib/hooks/use-dashboard-theme";

/**
 * Dark/light switch for the staff surfaces. Shows the mode it switches *to*,
 * which is what a person expects from a one-button toggle.
 */
export function DashboardThemeToggle() {
  const { theme, toggle } = useDashboardTheme();
  const t = useT();

  const label = theme === "dark" ? t.common.themeToLight : t.common.themeToDark;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={label}
      title={label}
    >
      {theme === "dark" ? <Sun /> : <Moon />}
    </Button>
  );
}
