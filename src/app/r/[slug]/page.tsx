import Image from "next/image";
import { Store, UtensilsCrossed } from "lucide-react";

import { DeliveryView } from "@/components/customer/delivery-view";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
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
 */
async function loadMenu(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_menu_by_slug", { p_slug: slug });
  return parseRestaurantMenu(data);
}

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
    admin.from("restaurants").select("settings").eq("id", restaurantId).maybeSingle(),
    admin
      .from("subscriptions")
      .select("tier, status, end_date")
      .eq("restaurant_id", restaurantId)
      .maybeSingle(),
  ]);

  return {
    openState: getOpenState(restaurant.data?.settings),
    canDeliver: canTakeDelivery(planFromRow(subscription.data)),
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
  const { openState, canDeliver } = await loadContext(restaurant.id);

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4">
      <header className="flex items-center gap-3 py-4">
        {restaurant.logoUrl ? (
          <Image
            src={restaurant.logoUrl}
            alt=""
            width={48}
            height={48}
            className="size-12 shrink-0 rounded-xl object-cover"
          />
        ) : (
          <span className="bg-primary/10 text-primary flex size-12 shrink-0 items-center justify-center rounded-xl">
            <Store className="size-6" />
          </span>
        )}

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold leading-tight">
            {restaurant.name}
          </h1>
        </div>

        <LanguageSwitcher />
      </header>

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
        <DeliveryView menu={menu} openState={openState} canDeliver={canDeliver} />
      )}
    </main>
  );
}
