import {
  ClipboardList,
  ImagePlus,
  Plus,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";

import { BulkPhotoDialog } from "@/components/menu/bulk-photo-dialog";
import { CategoryDialog } from "@/components/menu/category-dialog";
import { CategoryList } from "@/components/menu/category-list";
import type { CategoryWithItems } from "@/components/menu/category-section";
import { ItemDialog } from "@/components/menu/item-dialog";
import {
  ItemList,
  type MenuItem,
  type OptionCounts,
} from "@/components/menu/item-list";
import { LivePreviewButton } from "@/components/menu/live-preview-button";
import { PasteLinesDialog } from "@/components/menu/paste-lines-dialog";
import { StarterMenuDialog } from "@/components/menu/starter-menu-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getT } from "@/lib/i18n/server";
import { interpolate } from "@/lib/i18n";
import { getRestaurant } from "@/lib/restaurant";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata() {
  const t = await getT();
  return { title: t.meta.menu };
}

export default async function MenuPage() {
  const [restaurant, t] = await Promise.all([getRestaurant(), getT()]);
  const supabase = await createClient();

  // RLS scopes every query to the signed-in restaurant; no filter needed.
  const [{ data: categories }, { data: items }, { data: groups }, { data: prep }] =
    await Promise.all([
      supabase
        .from("menu_categories")
        .select("id, name, is_active, sort_order")
        .order("sort_order", { ascending: true }),
      supabase
        .from("menu_items")
        .select(
          "id, name, name_secondary, name_fa, description, description_secondary, description_fa, price, image_url, is_available, sort_order, category_id, tags, prep_minutes, auto_restore, cost"
        )
        .order("sort_order", { ascending: true }),
      // Option-group option counts, for the «N أحجام · N إضافات» card meta (§7.1).
      supabase.from("option_groups").select("item_id, max_select, options(count)"),
      // Learned prep time per item (§D.2). Scoped to this restaurant by the RPC;
      // returns only items with a trustworthy sample, so most start out empty.
      supabase.rpc("learned_prep_minutes", {}),
    ]);

  // itemId → { median, sample }, attached to each item for the builder suggestion.
  const prepByItem = new Map(
    (prep ?? []).map((row) => [
      row.menu_item_id,
      { median: row.median_minutes, sample: row.sample_size },
    ])
  );

  const allItems = (items ?? []).map((item) => ({
    ...item,
    learnedPrep: prepByItem.get(item.id) ?? null,
  }));

  // Fold groups into per-item counts: single-select groups are sizes, multi are
  // extras. A group's option count arrives as options: [{ count }].
  const optionCounts: OptionCounts = {};
  for (const group of groups ?? []) {
    const count = group.options?.[0]?.count ?? 0;
    const meta = (optionCounts[group.item_id] ??= { sizes: 0, extras: 0 });
    if ((group.max_select ?? 1) <= 1) meta.sizes += count;
    else meta.extras += count;
  }

  const withItems: CategoryWithItems[] = (categories ?? []).map((category) => ({
    ...category,
    items: allItems.filter((item) => item.category_id === category.id),
  }));

  // Deleting a category sets its items' category_id to null rather than removing
  // them, so they need somewhere to live or they would silently disappear.
  const uncategorised: MenuItem[] = allItems.filter(
    (item) => item.category_id === null
  );

  const isEmpty = withItems.length === 0 && uncategorised.length === 0;

  // Completeness (§3.3): a soft nudge, never a blocker. Having items is half the
  // way; photos are the rest, since they are what a diner actually sees.
  const totalItems = allItems.length;
  const withoutPhoto = allItems.filter((item) => !item.image_url).length;
  const readiness =
    totalItems === 0
      ? 0
      : Math.round(50 + 50 * ((totalItems - withoutPhoto) / totalItems));

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">{t.menu.title}</h1>
          <p className="text-muted-foreground text-sm">{t.menu.subtitle}</p>
          {totalItems > 0 && (
            <p className="text-muted-foreground text-xs">
              {interpolate(t.menu.countSummary, {
                items: totalItems,
                categories: withItems.length,
              })}
              {" · "}
              {interpolate(t.menu.readiness, { pct: readiness })}
              {withoutPhoto > 0 &&
                ` · ${interpolate(t.menu.addPhotosHint, { count: withoutPhoto })}`}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {!isEmpty && restaurant?.slug && (
            <LivePreviewButton slug={restaurant.slug} />
          )}
          {!isEmpty && restaurant && totalItems > 0 && (
            <BulkPhotoDialog
              restaurantId={restaurant.id}
              items={allItems.map((item) => ({ id: item.id, name: item.name }))}
              trigger={
                <Button variant="outline">
                  <ImagePlus />
                  {t.menu.bulkPhoto}
                </Button>
              }
            />
          )}
          <CategoryDialog
            trigger={
              <Button>
                <Plus />
                {t.menu.addCategory}
              </Button>
            }
          />
        </div>
      </div>

      {isEmpty ? (
        <Card>
          <CardContent className="text-muted-foreground flex flex-col items-center gap-3 py-12 text-center">
            <UtensilsCrossed className="size-10 opacity-40" />
            <div className="space-y-1">
              <p className="text-foreground font-medium">{t.menu.noCategories}</p>
              <p className="text-sm">{t.menu.noCategoriesHint}</p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <StarterMenuDialog
                trigger={
                  <Button>
                    <Sparkles />
                    {t.menu.importTemplate}
                  </Button>
                }
              />
              <CategoryDialog
                trigger={
                  <Button variant="outline">
                    <Plus />
                    {t.menu.addFirstCategory}
                  </Button>
                }
              />
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <CategoryList
            categories={withItems}
            restaurantId={restaurant!.id}
            optionCounts={optionCounts}
          />

          {uncategorised.length > 0 && (
            <section className="overflow-hidden rounded-lg border border-dashed">
              <header className="bg-muted/30 border-b p-3">
                <h2 className="font-semibold">
                  {t.menu.uncategorised}
                  <span className="text-muted-foreground text-xs font-normal">
                    {" "}
                    ({uncategorised.length}) — {t.menu.uncategorisedHint}
                  </span>
                </h2>
              </header>
              <ItemList
                items={uncategorised}
                restaurantId={restaurant!.id}
                categoryId={null}
                optionCounts={optionCounts}
              />
              <div className="flex items-center gap-1 border-t p-2">
                <ItemDialog
                  restaurantId={restaurant!.id}
                  categoryId={null}
                  trigger={
                    <Button variant="ghost" size="sm" className="flex-1">
                      <Plus />
                      {t.menu.addItemUncategorised}
                    </Button>
                  }
                />
                <PasteLinesDialog
                  categoryId={null}
                  trigger={
                    <Button variant="ghost" size="sm" aria-label={t.menu.pasteLines}>
                      <ClipboardList className="size-4" />
                    </Button>
                  }
                />
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
