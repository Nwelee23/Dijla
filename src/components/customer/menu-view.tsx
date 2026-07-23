"use client";

import { useRef, useState, useTransition } from "react";
import { Clock, Loader2, Minus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { CartBar } from "@/components/customer/cart-bar";
import { OrderTracker } from "@/components/customer/order-tracker";
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
import { usePlacedOrder } from "@/lib/hooks/use-placed-order";
import { interpolate } from "@/lib/i18n";
import type { DineInMenu, MenuItem } from "@/lib/menu";
import type { OpenState } from "@/lib/opening";
import type { PlaceOrderResponse } from "@/lib/orders";
import { formatMoney } from "@/lib/utils";

export function MenuView({
  menu,
  qrToken,
  openState,
}: {
  menu: DineInMenu;
  qrToken: string;
  openState: OpenState;
}) {
  const t = useT();
  const cart = useCart(menu.table.id);
  const placed = usePlacedOrder(menu.table.id);

  const [selected, setSelected] = useState<MenuItem | null>(null);
  const [itemOpen, setItemOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [isSending, startSending] = useTransition();

  // Held across retries so a resend after a dropped response is recognised as
  // the same order, and cleared once one actually lands.
  const requestId = useRef<string | null>(null);

  const { currency } = menu.restaurant;

  // A cart can outlive the menu it was built from — the phone was locked for an
  // hour and the kitchen sold out in the meantime. Work out which lines are
  // still orderable during render rather than mutating the cart in an effect.
  const liveIds = new Set(
    menu.categories.flatMap((category) => category.items.map((item) => item.id))
  );
  const orderableLines = cart.lines.filter((line) => liveIds.has(line.itemId));
  const hasStaleLines = orderableLines.length !== cart.lines.length;
  const orderableTotal = orderableLines.reduce(
    (sum, line) => sum + line.price * line.quantity,
    0
  );
  const orderableCount = orderableLines.reduce(
    (sum, line) => sum + line.quantity,
    0
  );

  function placeOrder() {
    requestId.current ??= crypto.randomUUID();

    startSending(async () => {
      let result: PlaceOrderResponse;
      try {
        const response = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            qrToken,
            requestId: requestId.current,
            // Only ids, quantities and notes leave the phone. The server
            // re-reads every price, so nothing here can change the bill.
            lines: orderableLines.map((line) => ({
              itemId: line.itemId,
              quantity: line.quantity,
              note: line.note,
              optionIds: line.optionIds ?? [],
            })),
          }),
        });
        result = (await response.json()) as PlaceOrderResponse;
      } catch {
        toast.error(t.order.errors.network);
        return;
      }

      if (!result.ok) {
        const messages = t.order.errors as Record<string, string>;
        toast.error(messages[result.error] ?? t.order.errors.server_error);
        return;
      }

      requestId.current = null;
      placed.save(result.orderId, result.orderNumber);
      cart.clear();
      setCartOpen(false);
    });
  }

  function openItem(item: MenuItem) {
    setSelected(item);
    setItemOpen(true);
  }

  if (placed.order) {
    return (
      <OrderTracker
        orderId={placed.order.orderId}
        fallbackOrderNumber={placed.order.orderNumber}
        qrToken={qrToken}
        currency={currency}
        onNewOrder={placed.clearOrder}
      />
    );
  }

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
        onSelect={openItem}
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
          count={orderableCount}
        subtotal={orderableTotal}
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
            {cart.lines.length === 0 ? (
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
                          onClick={() =>
                            cart.setQuantity(index, line.quantity - 1)
                          }
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
                          onClick={() =>
                            cart.setQuantity(index, line.quantity + 1)
                          }
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
                    {formatMoney(orderableTotal, currency)}
                  </span>
                </div>

                <Button
                  className="h-12 w-full text-base"
                  onClick={placeOrder}
                  disabled={isSending || orderableLines.length === 0}
                >
                  {isSending && <Loader2 className="animate-spin" />}
                  {isSending ? t.order.placing : t.order.place}
                </Button>

                <Button
                  variant="ghost"
                  className="h-11 w-full"
                  onClick={() => setCartOpen(false)}
                  disabled={isSending}
                >
                  {t.customer.backToMenu}
                </Button>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
