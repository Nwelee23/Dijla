"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { useT } from "@/components/i18n/i18n-provider";

/**
 * Dark/light switch for the public surfaces (customer menu), driven by the
 * next-themes preference. Styled to sit on the coloured header — a translucent
 * pill, not a shadcn button, so it reads as chrome over the gradient.
 *
 * `resolvedTheme` is only known after mount (the server has no window), so the
 * icon is held neutral until then to avoid a hydration mismatch.
 */
export function CustomerThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const t = useT();
  const [mounted, setMounted] = useState(false);
  // One-time mount flag: resolvedTheme is unknown on the server, so the icon is
  // held neutral until the client knows it. This is the documented next-themes
  // guard; it runs once and cannot cascade.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";
  const label = isDark ? t.common.themeToLight : t.common.themeToDark;

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={label}
      title={label}
      className="flex size-8 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition-colors hover:bg-white/25"
    >
      {mounted ? (
        isDark ? (
          <Sun className="size-4" />
        ) : (
          <Moon className="size-4" />
        )
      ) : (
        <Sun className="size-4 opacity-0" />
      )}
    </button>
  );
}
