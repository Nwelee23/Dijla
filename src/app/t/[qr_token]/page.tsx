import { cache } from "react";
import { QrCode, UtensilsCrossed } from "lucide-react";

import { MenuHeader } from "@/components/customer/menu-header";
import { MenuView } from "@/components/customer/menu-view";
import { interpolate } from "@/lib/i18n";
import { getT } from "@/lib/i18n/server";
import { parseDineInMenu } from "@/lib/menu";
import { getOpenState } from "@/lib/opening";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * The dine-in menu, reached by scanning the QR on a table.
 *
 * Fully anonymous: no account, no install, no typing. Everything the page needs
 * comes from one SECURITY DEFINER function (0005), so the diner's browser never
 * gets read access to any table in the database.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ qr_token: string }>;
}) {
  const { qr_token } = await params;
  const [t, menu] = await Promise.all([getT(), loadMenu(qr_token)]);

  return {
    title: menu ? `${menu.restaurant.name}` : t.customer.invalidTitle,
  };
}

// cache() so the metadata pass and the page render share one RPC call instead
// of hitting the database twice for the same token on every scan.
const loadMenu = cache(async (token: string) => {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_menu_by_qr_token", {
    p_token: token,
  });

  return parseDineInMenu(data);
});

/**
 * Opening hours live in `restaurants.settings`, which the public menu function
 * deliberately never returns — the blob is free-form and will hold things that
 * are not the diner's business. Read server-side and scoped to the restaurant
 * the token already resolved to.
 */
async function loadContext(restaurantId: string) {
  const admin = createAdminClient();

  // Bring back yesterday's sold-out items at the start of the service day (§6),
  // lazily on first read. Best effort — a failed restore must never blank the
  // menu, so it is fired alongside the read and its result ignored.
  const [{ data }] = await Promise.all([
    admin
      .from("restaurants")
      .select("settings, menu_layout")
      .eq("id", restaurantId)
      .maybeSingle(),
    admin.rpc("restore_sold_out", { p_restaurant: restaurantId }),
  ]);

  return { openState: getOpenState(data?.settings), layout: data?.menu_layout ?? null };
}

export default async function TableMenuPage({
  params,
}: {
  params: Promise<{ qr_token: string }>;
}) {
  const { qr_token } = await params;
  const [t, menu] = await Promise.all([getT(), loadMenu(qr_token)]);

  // One screen for an unknown token, a deactivated table and a closed
  // restaurant alike — a stranger holding a QR should not learn which it was.
  if (!menu) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <QrCode className="text-muted-foreground size-12" />
        <div className="space-y-2">
          <h1 className="text-xl font-bold">{t.customer.invalidTitle}</h1>
          <p className="text-muted-foreground max-w-xs text-balance">
            {t.customer.invalidBody}
          </p>
        </div>
      </main>
    );
  }

  const { restaurant, table } = menu;
  const { openState, layout } = await loadContext(restaurant.id);

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4">
      <MenuHeader
        name={restaurant.name}
        logoUrl={restaurant.logoUrl}
        isOpen={openState.isOpen}
        contextLabel={interpolate(t.customer.tableLabel, {
          number: table.tableNumber,
        })}
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
        <MenuView
          menu={menu}
          qrToken={qr_token}
          openState={openState}
          layout={layout}
        />
      )}
    </main>
  );
}
