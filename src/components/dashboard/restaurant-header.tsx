import Image from "next/image";
import Link from "next/link";
import { Store } from "lucide-react";

import { SignOutButton } from "@/components/layout/sign-out-button";
import type { Restaurant } from "@/lib/restaurant";

/** Header for the dashboard: which restaurant you are looking at, and a way out. */
export function RestaurantHeader({
  restaurant,
  ownerName,
}: {
  restaurant: Restaurant;
  ownerName: string | null;
}) {
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

        <SignOutButton />
      </div>
    </header>
  );
}
