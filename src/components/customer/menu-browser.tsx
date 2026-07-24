"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import {
  ImageOff,
  Plus,
  Search,
  SlidersHorizontal,
  UtensilsCrossed,
  X,
} from "lucide-react";

import { FilterSheet } from "@/components/customer/filter-sheet";
import { useT } from "@/components/i18n/i18n-provider";
import { Input } from "@/components/ui/input";
import {
  activeFacetCount,
  applyFilters,
  derivePrepThresholds,
  derivePriceBuckets,
  EMPTY_FILTERS,
  filtersToQuery,
  isFiltered,
  parseFilters,
  type Filters,
} from "@/lib/customer-filters";
import { useContentLang } from "@/lib/hooks/use-content-lang";
import { interpolate } from "@/lib/i18n";
import { pickDescription, pickName, type MenuCategory, type MenuItem } from "@/lib/menu";
import { resolveMenuLayout } from "@/lib/menu-layout";
import { cn, formatMoney } from "@/lib/utils";

/**
 * The customer menu body (REDESIGN_V2_SPEC §4.2, §4.4, §4.5, §5): instant
 * search, a filter panel (category, tags, price, prep) whose state lives in the
 * URL, a sticky scroll-spy category bar, and photo card rows with a quick-add
 * button and inline tag badges.
 *
 * Ordering itself (cart, options sheet, placing the order) stays with the
 * parent; this is presentation plus intent. The "most ordered" carousel needs a
 * popularity source and is not built yet — this is the layout it slots into.
 */
export function MenuBrowser({
  categories,
  currency,
  disabled = false,
  layout,
  onSelect,
  onQuickAdd,
}: {
  categories: MenuCategory[];
  currency: string;
  /** Browsing stays available when ordering is not — closed, or pro-gated. */
  disabled?: boolean;
  /** The restaurant's stored layout setting; `auto` resolves from photos (§8). */
  layout?: string | null;
  /** Open the detail sheet (whole-row tap, or quick-add on a required-option dish). */
  onSelect: (item: MenuItem) => void;
  /** Add one straight to the cart — only reached for dishes with no required options. */
  onQuickAdd: (item: MenuItem) => void;
}) {
  const t = useT();
  const searchParams = useSearchParams();
  const { lang } = useContentLang();
  const resolvedLayout = resolveMenuLayout(layout, categories);

  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const searching = q.length > 0;

  const [filters, setFilters] = useState<Filters>(() => parseFilters(searchParams));
  const [filterOpen, setFilterOpen] = useState(false);

  const buckets = useMemo(() => derivePriceBuckets(categories), [categories]);
  const prepThresholds = useMemo(() => derivePrepThresholds(categories), [categories]);
  const filtered = isFiltered(filters);
  const narrowed = filtered || searching;

  // Keep the URL in step with the filters so a filtered menu survives a refresh
  // and can be shared. history.replaceState (not the router) avoids a server
  // round trip that would re-fetch the menu on every toggle. Only filters go in
  // the URL — never any PII.
  useEffect(() => {
    const query = filtersToQuery(filters);
    const url = query
      ? `${window.location.pathname}?${query}`
      : window.location.pathname;
    window.history.replaceState(null, "", url);
  }, [filters]);

  const visible = useMemo(() => {
    const faceted = applyFilters(categories, filters, buckets);
    if (!searching) return faceted;
    // Search matches the active content language (§10).
    return faceted
      .map((category) => ({
        ...category,
        items: category.items.filter(
          (item) =>
            pickName(item, lang).toLowerCase().includes(q) ||
            (pickDescription(item, lang)?.toLowerCase().includes(q) ?? false)
        ),
      }))
      .filter((category) => category.items.length > 0);
  }, [categories, filters, buckets, q, searching, lang]);

  // Scroll-spy: the sticky bar highlights whichever section sits near the top.
  const [active, setActive] = useState<string | null>(categories[0]?.id ?? null);
  const sectionRefs = useRef(new Map<string, HTMLElement>());

  useEffect(() => {
    // No spy while the list is narrowed — the bar is hidden and sections shift.
    if (narrowed) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const inView = entries.filter((entry) => entry.isIntersecting);
        if (inView.length === 0) return;
        const top = inView.reduce((a, b) =>
          a.boundingClientRect.top < b.boundingClientRect.top ? a : b
        );
        setActive(top.target.getAttribute("data-cat"));
      },
      { rootMargin: "-140px 0px -65% 0px", threshold: 0 }
    );

    sectionRefs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [narrowed, visible]);

  function scrollTo(id: string) {
    setActive(id);
    sectionRefs.current
      .get(id)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const categoryName = (id: string) =>
    categories.find((category) => category.id === id)?.name ?? id;

  // Shared bits, so the three layouts never drift in behaviour.
  function tagBadges(item: MenuItem) {
    if (item.tags.length === 0) return null;
    return (
      <span className="flex flex-wrap gap-1">
        {item.tags.map((tag) => (
          <span
            key={tag}
            className="bg-brand-muted text-brand rounded-full px-2 py-0.5 text-xs font-medium"
          >
            {t.menu.tags[tag]}
          </span>
        ))}
      </span>
    );
  }

  function quickAdd(item: MenuItem) {
    if (disabled || !item.isAvailable) return null;
    return (
      <button
        type="button"
        aria-label={t.customer.quickAdd}
        onClick={() =>
          item.optionGroups.some((group) => group.isRequired)
            ? onSelect(item)
            : onQuickAdd(item)
        }
        className="bg-brand text-brand-foreground absolute bottom-3 end-3 flex size-9 items-center justify-center rounded-full shadow-sm transition-transform active:scale-95"
      >
        <Plus className="size-5" />
      </button>
    );
  }

  // Compact row — the `list` layout, and the tail of `featured`.
  function renderRow(item: MenuItem) {
    const soldOut = !item.isAvailable;
    const name = pickName(item, lang);
    const description = pickDescription(item, lang);
    return (
      <li key={item.id} className="relative">
        <button
          type="button"
          onClick={() => onSelect(item)}
          disabled={disabled || soldOut}
          className={cn(
            "flex w-full items-center gap-3 rounded-xl border p-3 text-start transition-colors",
            disabled || soldOut ? "opacity-60" : "hover:bg-accent/50 active:bg-accent"
          )}
        >
          <div className="bg-muted relative size-20 shrink-0 overflow-hidden rounded-lg">
            {item.imageUrl ? (
              <Image
                src={item.imageUrl}
                alt=""
                fill
                sizes="80px"
                className={cn("object-cover", soldOut && "grayscale")}
              />
            ) : (
              <span className="text-muted-foreground flex size-full items-center justify-center">
                <ImageOff className="size-5" />
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-1 pe-10">
            <p className="font-semibold leading-tight">{name}</p>
            {soldOut ? (
              <span className="text-destructive inline-block text-xs font-medium">
                {t.customer.soldOutBadge}
              </span>
            ) : (
              tagBadges(item)
            )}
            {description && (
              <p className="text-muted-foreground line-clamp-2 text-sm">
                {description}
              </p>
            )}
            <p
              className={cn(
                "font-bold",
                soldOut ? "text-muted-foreground" : "text-brand"
              )}
            >
              {formatMoney(item.price, currency)}
            </p>
          </div>
        </button>
        {quickAdd(item)}
      </li>
    );
  }

  // Photo card — the `grid` layout, and the `hero` of `featured` (spans 2 cols).
  function renderCard(item: MenuItem, hero: boolean) {
    const soldOut = !item.isAvailable;
    const name = pickName(item, lang);
    const description = pickDescription(item, lang);
    return (
      <li key={item.id} className={cn("relative", hero && "col-span-2")}>
        <button
          type="button"
          onClick={() => onSelect(item)}
          disabled={disabled || soldOut}
          className={cn(
            "block w-full overflow-hidden rounded-xl border text-start transition-colors",
            disabled || soldOut ? "opacity-60" : "hover:border-brand"
          )}
        >
          <div className={cn("bg-muted relative", hero ? "aspect-[16/9]" : "aspect-[4/3]")}>
            {item.imageUrl ? (
              <Image
                src={item.imageUrl}
                alt=""
                fill
                sizes={hero ? "(max-width: 640px) 100vw, 512px" : "(max-width: 640px) 50vw, 256px"}
                className={cn("object-cover", soldOut && "grayscale")}
              />
            ) : (
              <span className="text-muted-foreground flex size-full items-center justify-center">
                <ImageOff className="size-6" />
              </span>
            )}
            {soldOut && (
              <span className="bg-destructive absolute start-2 top-2 rounded-full px-2 py-0.5 text-xs font-medium text-white">
                {t.customer.soldOutBadge}
              </span>
            )}
          </div>

          <div className="space-y-1 p-3 pe-12">
            <p className="font-semibold leading-tight">{name}</p>
            {!soldOut && tagBadges(item)}
            {description && (
              <p className="text-muted-foreground line-clamp-2 text-sm">
                {description}
              </p>
            )}
            <p
              className={cn(
                "font-bold",
                soldOut ? "text-muted-foreground" : "text-brand"
              )}
            >
              {formatMoney(item.price, currency)}
            </p>
          </div>
        </button>
        {quickAdd(item)}
      </li>
    );
  }

  return (
    <div className="pb-28">
      <div className="mb-3 flex items-center gap-2">
        <div className="relative flex-1">
          <Search
            className="text-muted-foreground pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2"
            aria-hidden
          />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t.customer.searchPlaceholder}
            className="ps-9"
            inputMode="search"
            aria-label={t.customer.searchPlaceholder}
          />
        </div>
        <button
          type="button"
          onClick={() => setFilterOpen(true)}
          aria-label={t.customer.filters}
          className={cn(
            "relative flex size-10 shrink-0 items-center justify-center rounded-lg border transition-colors",
            filtered ? "border-brand text-brand" : "hover:bg-accent"
          )}
        >
          <SlidersHorizontal className="size-4" />
          {activeFacetCount(filters) > 0 && (
            <span className="bg-brand text-brand-foreground absolute -end-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full text-[0.6rem] font-bold">
              {activeFacetCount(filters)}
            </span>
          )}
        </button>
      </div>

      {/* Active-filter chips: each removable. */}
      {filtered && (
        <div className="mb-3 flex flex-wrap gap-2">
          {filters.categories.map((id) => (
            <RemovableChip
              key={`c-${id}`}
              label={categoryName(id)}
              onRemove={() =>
                setFilters((f) => ({
                  ...f,
                  categories: f.categories.filter((value) => value !== id),
                }))
              }
            />
          ))}
          {filters.tags.map((tag) => (
            <RemovableChip
              key={`t-${tag}`}
              label={t.menu.tags[tag]}
              onRemove={() =>
                setFilters((f) => ({
                  ...f,
                  tags: f.tags.filter((value) => value !== tag),
                }))
              }
            />
          ))}
          {filters.prep !== null && (
            <RemovableChip
              label={interpolate(t.customer.prepUnder, { count: filters.prep })}
              onRemove={() => setFilters((f) => ({ ...f, prep: null }))}
            />
          )}
          {filters.price !== null && buckets[filters.price] && (
            <RemovableChip
              label={t.customer.priceRange}
              onRemove={() => setFilters((f) => ({ ...f, price: null }))}
            />
          )}
          {filters.hideSoldOut && (
            <RemovableChip
              label={t.customer.hideSoldOut}
              onRemove={() => setFilters((f) => ({ ...f, hideSoldOut: false }))}
            />
          )}
        </div>
      )}

      {!narrowed && categories.length > 1 && (
        <div className="bg-background/95 sticky top-0 z-20 -mx-4 mb-2 overflow-x-auto border-b px-4 py-2 backdrop-blur">
          <div className="flex gap-2">
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => scrollTo(category.id)}
                className={cn(
                  "shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-sm transition-colors",
                  active === category.id
                    ? "border-brand bg-brand text-brand-foreground"
                    : "hover:bg-accent"
                )}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {visible.length === 0 ? (
        <div className="text-muted-foreground flex flex-col items-center gap-3 py-16 text-center">
          <UtensilsCrossed className="size-10 opacity-40" />
          <p>{t.customer.noResults}</p>
          {filtered && (
            <button
              type="button"
              className="text-brand font-medium"
              onClick={() => setFilters(EMPTY_FILTERS)}
            >
              {t.customer.clearFilters}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {visible.map((category, sectionIndex) => (
            <section
              key={category.id}
              data-cat={category.id}
              ref={(el) => {
                const map = sectionRefs.current;
                if (el) map.set(category.id, el);
                else map.delete(category.id);
              }}
              className="scroll-mt-20 space-y-3"
            >
              <h2 className="text-lg font-bold">{category.name}</h2>

              {resolvedLayout === "list" ? (
                <ul className="space-y-3">
                  {category.items.map((item) => renderRow(item))}
                </ul>
              ) : (
                <ul className="grid grid-cols-2 gap-3">
                  {category.items.map((item, itemIndex) =>
                    renderCard(
                      item,
                      resolvedLayout === "featured" &&
                        sectionIndex === 0 &&
                        itemIndex === 0
                    )
                  )}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}

      <FilterSheet
        open={filterOpen}
        onOpenChange={setFilterOpen}
        categories={categories}
        buckets={buckets}
        prepThresholds={prepThresholds}
        currency={currency}
        value={filters}
        onApply={setFilters}
      />
    </div>
  );
}

function RemovableChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <span className="bg-accent flex items-center gap-1 rounded-full py-1 pe-1 ps-3 text-sm">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`${label} ×`}
        className="hover:bg-background/60 flex size-5 items-center justify-center rounded-full"
      >
        <X className="size-3.5" />
      </button>
    </span>
  );
}
