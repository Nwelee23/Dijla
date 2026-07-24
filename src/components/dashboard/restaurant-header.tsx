import Image from "next/image";
import Link from "next/link";
import { ShieldCheck, Store } from "lucide-react";

import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { DashboardThemeToggle } from "@/components/theme/dashboard-theme-toggle";
import { getT } from "@/lib/i18n/server";
import type { Restaurant } from "@/lib/restaurant";
import { Button } from "@/components/ui/button";

/** Header for the dashboard: which restaurant you are looking at, and a way out. */
export async function RestaurantHeader({
  restaurant,
  ownerName,
  isAdmin = false,
}: {
  restaurant: Restaurant;
  ownerName: string | null;
  /** The platform admin gets a way across to /admin from their own dashboard. */
  isAdmin?: boolean;
}) {
  const t = await getT();
  return (
    <header className="bg-background sticky top-0 z-40 border-b">
      <div className="flex h-14 items-center justify-between gap-3 px-4">
        <Link href="/dashboard" className="flex min-w-0 items-center gap-2">
          {restaurant.logo_url ? (
            <Image
              src={restaurant.logo_url}
              alt=""
              width={32}
              height={32}
              className="size-8 shrink-0 rounded-md object-cover"
            />
          ) : (
            <span className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-md">
              <Store className="size-4" />
            </span>
          )}

          <span className="min-w-0">
            <span className="block truncate font-semibold leading-tight">
              {restaurant.name}
            </span>
            {ownerName && (
              <span className="text-muted-foreground block truncate text-xs leading-tight">
                {ownerName}
              </span>
            )}
          </span>
        </Link>

        <div className="flex items-center gap-1">
          {isAdmin && (
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin">
                <ShieldCheck />
                {t.admin.title}
              </Link>
            </Button>
          )}
          <DashboardThemeToggle />
          <LanguageSwitcher />
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
