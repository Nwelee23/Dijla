import { cache } from "react";
import { Store, UtensilsCrossed } from "lucide-react";

import { DeliveryView } from "@/components/customer/delivery-view";
import { MenuHeader } from "@/components/customer/menu-header";
import { getT } from "@/lib/i18n/server";
import { parseRestaurantMenu } from "@/lib/menu";
import { getOpenState } from "@/lib/opening";
import { canTakeDelivery, planFromRow } from "@/lib/plan";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * The restaurant's own delivery link.
 *
 * Same shape as the dine-in page: one SECURITY DEFINER function returns exactly
 * the menu, so an anonymous browser never gets read access to any table.
 *
 * cache() so the metadata pass and the page render share one RPC call rather
 * than reading the same menu from the database twice per visit.
 */
const loadMenu = cache(async (slug: string) => {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_menu_by_slug", { p_slug: slug });
  return parseRestaurantMenu(data);
});

/**
 * Hours live in `settings`, and the tier in `subscriptions` — neither is
 * something the public menu function returns, and neither should be: `settings`
 * is a grab-bag, and a customer has no business knowing what a restaurant pays
 * us. Both are read here, server-side, and only their conclusions reach the
 * browser.
 */
async function loadContext(restaurantId: string) {
  const admin = createAdminClient();

  const [restaurant, subscription] = await Promise.all([
    admin
      .from("restaurants")
      .select("settings, menu_layout")
      .eq("id", restaurantId)
      .maybeSingle(),
    admin
      .from("subscriptions")
      .select("tier, status, end_date")
      .eq("restaurant_id", restaurantId)
      .maybeSingle(),
    // Lazy next-service-day restore of sold-out items (§6). Best effort.
    admin.rpc("restore_sold_out", { p_restaurant: restaurantId }),
  ]);

  return {
    openState: getOpenState(restaurant.data?.settings),
    canDeliver: canTakeDelivery(planFromRow(subscription.data)),
    layout: restaurant.data?.menu_layout ?? null,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [t, menu] = await Promise.all([getT(), loadMenu(slug)]);

  return { title: menu ? menu.restaurant.name : t.customer.invalidTitle };
}

export default async function RestaurantMenuPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [t, menu] = await Promise.all([getT(), loadMenu(slug)]);

  // Unknown slug and closed-down restaurant look identical from outside.
  if (!menu) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <Store className="text-muted-foreground size-12" />
        <div className="space-y-2">
          <h1 className="text-xl font-bold">{t.customer.invalidTitle}</h1>
          <p className="text-muted-foreground max-w-xs text-balance">
            {t.customer.invalidBody}
          </p>
        </div>
      </main>
    );
  }

  const { restaurant } = menu;
  const { openState, canDeliver, layout } = await loadContext(restaurant.id);

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4">
      <MenuHeader
        name={restaurant.name}
        logoUrl={restaurant.logoUrl}
        isOpen={openState.isOpen}
      />

      {menu.categories.length === 0 ? (
        <div className="text-muted-foreground flex flex-col items-center gap-3 py-16 text-center">
          <UtensilsCrossed className="size-10 opacity-40" />
          <div className="space-y-1">
            <p className="text-foreground font-medium">
              {t.customer.emptyMenuTitle}
            </p>
            <p className="text-sm">{t.customer.emptyMenuBody}</p>
          </div>
        </div>
      ) : (
        <DeliveryView
          menu={menu}
          openState={openState}
          canDeliver={canDeliver}
          layout={layout}
        />
      )}
    </main>
  );
}
