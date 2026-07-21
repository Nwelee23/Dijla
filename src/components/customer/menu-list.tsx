"use client";

import Image from "next/image";
import { ImageOff } from "lucide-react";

import type { MenuCategory, MenuItem } from "@/lib/menu";
import { cn, formatMoney } from "@/lib/utils";

/**
 * The menu itself, shared by the dine-in page and the delivery link.
 *
 * Extracted rather than duplicated: the two entry points differ in how an order
 * is checked out, not in how a menu looks, and a diner scanning a table QR and
 * a customer opening the delivery link should not drift into two different
 * menus over time.
 */
export function MenuList({
  categories,
  currency,
  disabled = false,
  onSelect,
}: {
  categories: MenuCategory[];
  currency: string;
  /** Browsing stays available when ordering is not — closed, or pro-gated. */
  disabled?: boolean;
  onSelect: (item: MenuItem) => void;
}) {
  return (
    // Bottom padding clears the sticky cart bar so the last dish stays tappable.
    <div className="space-y-8 pb-28">
      {categories.map((category) => (
        <section key={category.id} className="space-y-3">
          <h2 className="bg-background/95 sticky top-0 z-10 py-2 text-lg font-bold backdrop-blur">
            {category.name}
          </h2>

          <ul className="space-y-3">
            {category.items.map((item) => (
              <li key={item.id}>
                {/* The whole row is the target — precise taps are hard standing up. */}
                <button
                  type="button"
                  onClick={() => onSelect(item)}
                  disabled={disabled}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border p-3 text-start transition-colors",
                    disabled
                      ? "opacity-70"
                      : "hover:bg-accent/50 active:bg-accent"
                  )}
                >
                  <div className="bg-muted relative size-20 shrink-0 overflow-hidden rounded-lg">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt=""
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    ) : (
                      <span className="text-muted-foreground flex size-full items-center justify-center">
                        <ImageOff className="size-5" />
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="font-semibold leading-tight">{item.name}</p>
                    {item.description && (
                      <p className="text-muted-foreground line-clamp-2 text-sm">
                        {item.description}
                      </p>
                    )}
                    <p className="text-primary font-bold">
                      {formatMoney(item.price, currency)}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
