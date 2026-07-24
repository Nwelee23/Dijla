import Link from "next/link";

import { LogoMark } from "@/components/brand/logo-mark";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";

/**
 * The river-night glass shell every auth screen sits in (AUTH_UI_SPEC §1.4).
 *
 * A server component on purpose: it only lays out the gradient, the logo tile
 * and one glass card, then renders the screen's own form as children. The deep
 * gradient lives on `.dj-auth`, scoped in globals.css so it never touches the
 * dashboard theme. One glass layer only — the card — so nothing nests glass.
 */
export function AuthShell({
  brand,
  title,
  subtitle,
  children,
}: {
  brand: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <main className="dj-auth flex flex-1 flex-col items-center justify-center gap-6 p-4">
      <div className="flex w-full max-w-[340px] items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold">
          <span className="dj-logo-tile">
            {/* plain mark: inherits the tile's emerald currentColor on glass */}
            <LogoMark variant="plain" className="size-6" />
          </span>
          <span className="text-lg">{brand}</span>
        </Link>
        <LanguageSwitcher variant="ghost" />
      </div>

      <section className="dj-glass w-full max-w-[340px] p-6">
        <header className="mb-5 space-y-1">
          <h1 className="text-xl font-bold">{title}</h1>
          <p className="text-sm" style={{ color: "var(--dj-muted)" }}>
            {subtitle}
          </p>
        </header>
        {children}
      </section>
    </main>
  );
}
