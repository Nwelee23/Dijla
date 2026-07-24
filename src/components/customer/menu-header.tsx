"use client";

import Image from "next/image";
import { Store } from "lucide-react";

import { ContentLangSwitcher } from "@/components/customer/content-lang-switcher";
import { useT } from "@/components/i18n/i18n-provider";
import { CustomerThemeToggle } from "@/components/theme/customer-theme-toggle";

/**
 * The customer menu header (REDESIGN_V2_SPEC §4.1): a coloured gradient cover
 * with the language / theme controls floating on it, and a restaurant card
 * lifted over the seam — logo, name, and an open/closed status line.
 *
 * Cuisine type and average prep time (also §4.1) are not shown yet: prep time
 * has no data source until the R4/R5 migrations land, and cuisine is added when
 * that plumbing arrives. The card is built to take them without a reflow.
 */
export function MenuHeader({
  name,
  logoUrl,
  isOpen,
  contextLabel,
}: {
  name: string;
  logoUrl: string | null;
  isOpen: boolean;
  /** e.g. «طاولة ٥» for dine-in; omitted on the delivery link. */
  contextLabel?: string | null;
}) {
  const t = useT();

  return (
    <div className="mb-4">
      <div
        className="relative h-24 rounded-b-3xl"
        style={{
          background:
            "linear-gradient(135deg, var(--brand) 0%, var(--brand-deep) 100%)",
        }}
      >
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3">
          {contextLabel ? (
            <span className="rounded-full bg-white/15 px-3 py-1 text-sm font-medium text-white backdrop-blur">
              {contextLabel}
            </span>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-1.5">
            <CustomerThemeToggle />
            <ContentLangSwitcher />
          </div>
        </div>
      </div>

      <div className="bg-card -mt-8 flex items-center gap-3 rounded-2xl border p-3 shadow-xs">
        {logoUrl ? (
          <Image
            src={logoUrl}
            alt=""
            width={56}
            height={56}
            className="size-14 shrink-0 rounded-xl object-cover"
          />
        ) : (
          <span className="bg-brand-muted text-brand flex size-14 shrink-0 items-center justify-center rounded-xl">
            <Store className="size-7" />
          </span>
        )}

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold leading-tight">{name}</h1>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm">
            <span
              className={
                isOpen
                  ? "bg-brand size-2 rounded-full"
                  : "bg-muted-foreground size-2 rounded-full"
              }
              aria-hidden
            />
            <span className={isOpen ? "text-brand font-medium" : "text-muted-foreground"}>
              {isOpen ? t.customer.openNow : t.customer.closedNow}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
