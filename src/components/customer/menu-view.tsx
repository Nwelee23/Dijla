"use client";

import { useState } from "react";
import Image from "next/image";
import { ImageOff, Minus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { CartBar } from "@/components/customer/cart-bar";
import { ItemSheet } from "@/components/customer/item-sheet";
import { useT } from "@/components/i18n/i18n-provider";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useCart } from "@/lib/hooks/use-cart";
import type { DineInMenu, MenuItem } from "@/lib/menu";
import { formatMoney } from "@/lib/utils";

export function MenuView({ menu }: { menu: DineInMenu }) {
  const t = useT();
  const cart = useCart(menu.table.id);

  const [selected, setSelected] = useState<MenuItem | null>(null);
  const [itemOpen, setItemOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  const { currency } = menu.restaurant;

  function openItem(item: MenuItem) {
    setSelected(item);
    setItemOpen(true);
  }

  return (
    <>
      {/* Bottom padding clears the sticky cart bar so the last dish stays tappable. */}
      <div className="space-y-8 pb-28">
        {menu.categories.map((category) => (
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
                    onClick={() => openItem(item)}
                    className="hover:bg-accent/50 active:bg-accent flex w-full items-center gap-3 rounded-xl border p-3 text-start transition-colors"
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

      <CartBar
        count={cart.count}
        subtotal={cart.subtotal}
        currency={currency}
        onReview={() => setCartOpen(true)}
      />

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
                        <p className="text-muted-foreground text-sm tabular-nums">
                          {formatMoney(line.price * line.quantity, currency)}
                        </p>
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

                <div className="flex items-center justify-between border-t pt-3 text-lg font-bold">
                  <span>{t.customer.subtotal}</span>
                  <span className="tabular-nums">
                    {formatMoney(cart.subtotal, currency)}
                  </span>
                </div>

                <Button
                  variant="outline"
                  className="h-12 w-full"
                  onClick={() => setCartOpen(false)}
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
