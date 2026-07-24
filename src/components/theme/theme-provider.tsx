"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * Theme for the public surfaces — the customer menu, the landing page, auth,
 * and anything else rendered outside a StaffThemeScope.
 *
 * Defaults to light: these screens are food photography on a stranger's phone,
 * and photography reads better on light (REDESIGN_V2_SPEC §2). "System" is
 * still offered, and whatever the visitor picks persists on their device.
 *
 * The staff surfaces do not read this — they have their own store and their own
 * dark default. See `useDashboardTheme`.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
      storageKey="dijla:theme"
      // Light is a deliberately unreferenced marker class, not `.light`. Light
      // tokens come from `:root`, so the marker styles nothing. Keeping it off
      // `.light` means a light document root never suppresses a staff `.dark`
      // scope nested beneath it (see the `dark` custom-variant in globals.css).
      value={{ light: "theme-light", dark: "dark" }}
    >
      {children}
    </NextThemesProvider>
  );
}
