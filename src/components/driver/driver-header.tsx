import { Bike, LogOut, Package, Wallet } from "lucide-react";

import { signOutDriver } from "@/app/driver/actions";
import { DriverAvailability } from "@/components/driver/driver-availability";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { getT } from "@/lib/i18n/server";
import { interpolate } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/utils";

/**
 * The driver app's top bar. A server component: the sign-out is a form posting
 * to a server action, so it works even if the page's client JS has not loaded —
 * which on a driver's connection is a real case, not a hypothetical.
 */
export async function DriverHeader({
  driverName,
  restaurantName,
  status,
  cashInHand,
  deliveredToday,
}: {
  driverName: string;
  restaurantName: string;
  status: string;
  cashInHand: number;
  deliveredToday: number;
}) {
  const t = await getT();

  return (
    <header className="bg-background sticky top-0 z-10 border-b">
      <div className="mx-auto w-full max-w-md space-y-2 p-3">
        <div className="flex items-center gap-3">
          <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
            <Bike className="size-5" />
          </span>

          <div className="min-w-0 flex-1">
            <p className="truncate font-bold leading-tight">{driverName}</p>
            <p className="text-muted-foreground truncate text-xs">
              {restaurantName}
            </p>
          </div>

          <DriverAvailability status={status} />

          <LanguageSwitcher variant="ghost" />

          <form action={signOutDriver}>
            <Button type="submit" variant="ghost" size="icon" aria-label={t.driverApp.signOut}>
              <LogOut />
            </Button>
          </form>
        </div>

        {/* The cash rule (§A.5): cash in hand is on every screen, most prominent —
            it is the #1 source of end-of-shift disputes. */}
        <div className="flex items-stretch gap-2">
          <div className="text-muted-foreground flex flex-1 items-center justify-center gap-1.5 rounded-lg border py-1.5 text-xs">
            <Package className="size-3.5" />
            {interpolate(t.driverApp.deliveriesToday, { count: deliveredToday })}
          </div>
          <div className="bg-primary/10 text-primary flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-sm font-bold tabular-nums">
            <Wallet className="size-4" />
            {t.driverApp.cashInHand}: {formatMoney(cashInHand)}
          </div>
        </div>
      </div>
    </header>
  );
}
