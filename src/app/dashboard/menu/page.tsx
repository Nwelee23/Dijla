import { Plus, Sparkles, UtensilsCrossed } from "lucide-react";

import { CategoryDialog } from "@/components/menu/category-dialog";
import { CategoryList } from "@/components/menu/category-list";
import type { CategoryWithItems } from "@/components/menu/category-section";
import { ItemDialog } from "@/components/menu/item-dialog";
import { ItemList, type MenuItem } from "@/components/menu/item-list";
import { StarterMenuDialog } from "@/components/menu/starter-menu-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getT } from "@/lib/i18n/server";
import { getRestaurant } from "@/lib/restaurant";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata() {
  const t = await getT();
  return { title: t.meta.menu };
}

export default async function MenuPage() {
  const [restaurant, t] = await Promise.all([getRestaurant(), getT()]);
  const supabase = await createClient();

  // RLS scopes both queries to the signed-in restaurant; no filter needed.
  const [{ data: categories }, { data: items }] = await Promise.all([
    supabase
      .from("menu_categories")
      .select("id, name, is_active, sort_order")
      .order("sort_order", { ascending: true }),
    supabase
      .from("menu_items")
      .select(
        "id, name, description, price, image_url, is_available, sort_order, category_id"
      )
      .order("sort_order", { ascending: true }),
  ]);

  const allItems = items ?? [];

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

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t.menu.title}</h1>
          <p className="text-muted-foreground text-sm">
            {t.menu.subtitle}
          </p>
        </div>

        <CategoryDialog
          trigger={
            <Button>
              <Plus />
              {t.menu.addCategory}
            </Button>
          }
        />
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
              />
              <div className="border-t p-2">
                <ItemDialog
                  restaurantId={restaurant!.id}
                  categoryId={null}
                  trigger={
                    <Button variant="ghost" size="sm" className="w-full">
                      <Plus />
                      {t.menu.addItemUncategorised}
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
