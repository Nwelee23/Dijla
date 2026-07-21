import { Bike, LogOut } from "lucide-react";

import { signOutDriver } from "@/app/driver/actions";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { getT } from "@/lib/i18n/server";
import { Button } from "@/components/ui/button";

/**
 * The driver app's top bar. A server component: the sign-out is a form posting
 * to a server action, so it works even if the page's client JS has not loaded —
 * which on a driver's connection is a real case, not a hypothetical.
 */
export async function DriverHeader({
  driverName,
  restaurantName,
  status,
}: {
  driverName: string;
  restaurantName: string;
  status: string;
}) {
  const t = await getT();
  const statusLabel =
    t.drivers.status[status as keyof typeof t.drivers.status] ?? status;

  return (
    <header className="bg-background sticky top-0 z-10 border-b">
      <div className="mx-auto flex w-full max-w-md items-center gap-3 p-3">
        <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
          <Bike className="size-5" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate font-bold leading-tight">{driverName}</p>
          <p className="text-muted-foreground truncate text-xs">
            {restaurantName} · {statusLabel}
          </p>
        </div>

        <LanguageSwitcher variant="ghost" />

        <form action={signOutDriver}>
          <Button type="submit" variant="ghost" size="icon" aria-label={t.driverApp.signOut}>
            <LogOut />
          </Button>
        </form>
      </div>
    </header>
  );
}
