"use client";

import { useState } from "react";
import { Clock, Minus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { CartBar } from "@/components/customer/cart-bar";
import { CheckoutSheet } from "@/components/customer/checkout-sheet";
import { ItemSheet } from "@/components/customer/item-sheet";
import { MenuList } from "@/components/customer/menu-list";
import { useT } from "@/components/i18n/i18n-provider";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useCart } from "@/lib/hooks/use-cart";
import { interpolate } from "@/lib/i18n";
import type { MenuItem, RestaurantMenu } from "@/lib/menu";
import type { OpenState } from "@/lib/opening";
import { formatMoney } from "@/lib/utils";

/**
 * The delivery-link entry point.
 *
 * Same menu and cart as the dine-in page; the difference is what happens at
 * checkout — there is no table, so the customer has to say who and where they
 * are. That step arrives in 3.2 and 3.3.
 */
export function DeliveryView({
  menu,
  openState,
}: {
  menu: RestaurantMenu;
  openState: OpenState;
}) {
  const t = useT();
  // Scoped by restaurant: someone ordering from two restaurants in one evening
  // must not have their baskets merge.
  const cart = useCart(`r:${menu.restaurant.id}`);

  const [selected, setSelected] = useState<MenuItem | null>(null);
  const [itemOpen, setItemOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const { currency } = menu.restaurant;

  // A basket can outlive the menu it was built from.
  const liveIds = new Set(
    menu.categories.flatMap((category) => category.items.map((item) => item.id))
  );
  const orderableLines = cart.lines.filter((line) => liveIds.has(line.itemId));
  const hasStaleLines = orderableLines.length !== cart.lines.length;
  const subtotal = orderableLines.reduce(
    (sum, line) => sum + line.price * line.quantity,
    0
  );
  const count = orderableLines.reduce((sum, line) => sum + line.quantity, 0);

  return (
    <>
      {!openState.isOpen && (
        <div className="mb-4 space-y-1 rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/40">
          <p className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-200">
            <Clock className="size-4 shrink-0" />
            {t.closed.title}
          </p>
          <p className="text-sm text-amber-900/80 dark:text-amber-200/80">
            {openState.today.closed
              ? t.closed.closedToday
              : interpolate(t.closed.todayHours, {
                  open: openState.today.open,
                  close: openState.today.close,
                })}
          </p>
          <p className="text-sm text-amber-900/80 dark:text-amber-200/80">
            {t.closed.browseOnly}
          </p>
        </div>
      )}

      <MenuList
        categories={menu.categories}
        currency={currency}
        disabled={!openState.isOpen}
        onSelect={(item) => {
          setSelected(item);
          setItemOpen(true);
        }}
      />

      <ItemSheet
        item={selected}
        currency={currency}
        open={itemOpen}
        onOpenChange={setItemOpen}
        onAdd={(item, quantity, note) => {
          cart.add(item, quantity, note);
          toast.success(t.customer.added);
        }}
      />

      {openState.isOpen && (
        <CartBar
          count={count}
          subtotal={subtotal}
          currency={currency}
          onReview={() => setCartOpen(true)}
        />
      )}

      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
          <SheetHeader className="text-start">
            <SheetTitle>{t.customer.yourOrder}</SheetTitle>
          </SheetHeader>

          <div className="space-y-4 px-4 pb-6">
            {orderableLines.length === 0 ? (
              <p className="text-muted-foreground py-6 text-center">
                {t.customer.emptyCart}
              </p>
            ) : (
              <>
                <ul className="divide-y">
                  {cart.lines.map((line, index) => (
                    <li
                      key={`${line.itemId}-${line.note}`}
                      className="flex items-start gap-3 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{line.name}</p>
                        {line.note && (
                          <p className="text-muted-foreground text-sm">
                            {line.note}
                          </p>
                        )}
                        {liveIds.has(line.itemId) ? (
                          <p className="text-muted-foreground text-sm tabular-nums">
                            {formatMoney(line.price * line.quantity, currency)}
                          </p>
                        ) : (
                          <p className="text-destructive text-sm font-medium">
                            {t.closed.unavailableLine}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="size-9"
                          aria-label={
                            line.quantity === 1
                              ? t.customer.removeLine
                              : t.customer.decrease
                          }
                          onClick={() => cart.setQuantity(index, line.quantity - 1)}
                        >
                          {line.quantity === 1 ? (
                            <Trash2 className="text-destructive" />
                          ) : (
                            <Minus />
                          )}
                        </Button>
                        <span className="w-8 text-center font-bold tabular-nums">
                          {line.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="size-9"
                          aria-label={t.customer.increase}
                          onClick={() => cart.setQuantity(index, line.quantity + 1)}
                        >
                          <Plus />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>

                {hasStaleLines && (
                  <p className="text-destructive text-sm">
                    {t.closed.removedStale}
                  </p>
                )}

                <div className="flex items-center justify-between border-t pt-3 text-lg font-bold">
                  <span>{t.customer.subtotal}</span>
                  <span className="tabular-nums">
                    {formatMoney(subtotal, currency)}
                  </span>
                </div>

                <Button
                  className="h-12 w-full text-base"
                  onClick={() => {
                    setCartOpen(false);
                    setCheckoutOpen(true);
                  }}
                >
                  {t.checkout.title}
                </Button>

                <Button
                  variant="ghost"
                  className="h-11 w-full"
                  onClick={() => setCartOpen(false)}
                >
                  {t.customer.backToMenu}
                </Button>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
      <CheckoutSheet
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        subtotal={subtotal}
        deliveryFee={menu.restaurant.deliveryFee}
        currency={currency}
        isSubmitting={false}
        onSubmit={() => {
          // Wired to the server route in 3.3.
        }}
      />
    </>
  );
}
