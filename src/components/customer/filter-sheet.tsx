"use client";

import { useEffect, useState } from "react";

import { useT } from "@/components/i18n/i18n-provider";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  countMatches,
  EMPTY_FILTERS,
  isFiltered,
  type Filters,
  type PriceBucket,
} from "@/lib/customer-filters";
import { interpolate } from "@/lib/i18n";
import { MENU_TAGS, type MenuTag } from "@/lib/menu-tags";
import type { MenuCategory } from "@/lib/menu";
import { cn, formatMoney } from "@/lib/utils";

/**
 * The filter panel (REDESIGN_V2_SPEC §5). Edits a *draft* — the menu behind it
 * does not move until "apply" — and the apply button shows the live match count
 * so nobody filters themselves into an empty screen.
 */
export function FilterSheet({
  open,
  onOpenChange,
  categories,
  buckets,
  prepThresholds,
  currency,
  value,
  onApply,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: MenuCategory[];
  buckets: PriceBucket[];
  prepThresholds: number[];
  currency: string;
  value: Filters;
  onApply: (filters: Filters) => void;
}) {
  const t = useT();
  const [draft, setDraft] = useState<Filters>(value);

  // Re-sync the draft to whatever is applied each time the sheet opens. This is
  // a deliberate open-edge sync, not a render loop — it runs only when `open`
  // flips true.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) setDraft(value);
  }, [open, value]);

  const count = countMatches(categories, draft, buckets);

  function toggleCategory(id: string) {
    setDraft((current) => ({
      ...current,
      categories: current.categories.includes(id)
        ? current.categories.filter((value) => value !== id)
        : [...current.categories, id],
    }));
  }

  function toggleTag(tag: MenuTag) {
    setDraft((current) => ({
      ...current,
      tags: current.tags.includes(tag)
        ? current.tags.filter((value) => value !== tag)
        : [...current.tags, tag],
    }));
  }

  function priceLabel(bucket: PriceBucket): string {
    if (bucket.min === 0 && bucket.max !== null) {
      return interpolate(t.customer.priceUnder, {
        price: formatMoney(bucket.max, currency),
      });
    }
    if (bucket.max === null) {
      return interpolate(t.customer.priceOver, {
        price: formatMoney(bucket.min, currency),
      });
    }
    return `${formatMoney(bucket.min, currency)} – ${formatMoney(bucket.max, currency)}`;
  }

  const chip = (on: boolean) =>
    cn(
      "rounded-full border px-3 py-1.5 text-sm transition-colors",
      on ? "border-brand bg-brand text-brand-foreground" : "hover:bg-accent"
    );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
        <SheetHeader className="text-start">
          <SheetTitle>{t.customer.filters}</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 px-4 pb-4">
          {categories.length > 1 && (
            <section className="space-y-2">
              <p className="font-medium">{t.customer.category}</p>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => toggleCategory(category.id)}
                    className={chip(draft.categories.includes(category.id))}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </section>
          )}

          <section className="space-y-2">
            <p className="font-medium">{t.customer.tagsLabel}</p>
            <div className="flex flex-wrap gap-2">
              {MENU_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={chip(draft.tags.includes(tag))}
                >
                  {t.menu.tags[tag]}
                </button>
              ))}
            </div>
          </section>

          {buckets.length > 0 && (
            <section className="space-y-2">
              <p className="font-medium">{t.customer.priceRange}</p>
              <div className="flex flex-wrap gap-2">
                {buckets.map((bucket, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        price: current.price === index ? null : index,
                      }))
                    }
                    className={chip(draft.price === index)}
                  >
                    {priceLabel(bucket)}
                  </button>
                ))}
              </div>
            </section>
          )}

          {prepThresholds.length > 0 && (
            <section className="space-y-2">
              <p className="font-medium">{t.customer.prepTime}</p>
              <div className="flex flex-wrap gap-2">
                {prepThresholds.map((minutes) => (
                  <button
                    key={minutes}
                    type="button"
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        prep: current.prep === minutes ? null : minutes,
                      }))
                    }
                    className={chip(draft.prep === minutes)}
                  >
                    {interpolate(t.customer.prepUnder, { count: minutes })}
                  </button>
                ))}
              </div>
            </section>
          )}

          <button
            type="button"
            onClick={() =>
              setDraft((current) => ({
                ...current,
                hideSoldOut: !current.hideSoldOut,
              }))
            }
            aria-pressed={draft.hideSoldOut}
            className={chip(draft.hideSoldOut)}
          >
            {t.customer.hideSoldOut}
          </button>

          <div className="flex items-center gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              className="flex-1"
              disabled={!isFiltered(draft)}
              onClick={() => setDraft(EMPTY_FILTERS)}
            >
              {t.customer.clearFilters}
            </Button>
            <Button
              type="button"
              className="flex-1"
              disabled={count === 0}
              onClick={() => {
                onApply(draft);
                onOpenChange(false);
              }}
            >
              {interpolate(t.customer.showResults, { count })}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
