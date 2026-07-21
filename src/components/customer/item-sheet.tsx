"use client";

import { useState } from "react";
import Image from "next/image";
import { ImageOff, Minus, Plus } from "lucide-react";

import { useT } from "@/components/i18n/i18n-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { interpolate } from "@/lib/i18n";
import type { MenuItem } from "@/lib/menu";
import { formatMoney } from "@/lib/utils";

/**
 * Bottom sheet for one dish: photo, description, quantity and a note.
 *
 * A sheet rather than a dialog because this opens on a phone held one-handed —
 * it slides up under the thumb instead of landing in the middle of the screen.
 */
export function ItemSheet({
  item,
  currency,
  open,
  onOpenChange,
  onAdd,
}: {
  item: MenuItem | null;
  currency: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (item: MenuItem, quantity: number, note: string) => void;
}) {
  const t = useT();
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");

  function handleOpenChange(next: boolean) {
    // Reset on open so the previous dish's note never carries over.
    if (next) {
      setQuantity(1);
      setNote("");
    }
    onOpenChange(next);
  }

  if (!item) return null;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto">
        <SheetHeader className="text-start">
          <SheetTitle className="text-xl">{item.name}</SheetTitle>
          {item.description && (
            <SheetDescription className="text-base">
              {item.description}
            </SheetDescription>
          )}
        </SheetHeader>

        <div className="space-y-5 px-4 pb-4">
          <div className="bg-muted relative aspect-[16/10] w-full overflow-hidden rounded-lg">
            {item.imageUrl ? (
              <Image
                src={item.imageUrl}
                alt=""
                fill
                sizes="(max-width: 640px) 100vw, 480px"
                className="object-cover"
              />
            ) : (
              <span className="text-muted-foreground flex size-full items-center justify-center">
                <ImageOff className="size-8" />
              </span>
            )}
          </div>

          <p className="text-primary text-2xl font-bold">
            {formatMoney(item.price, currency)}
          </p>

          <div className="space-y-2">
            <Label htmlFor="item-note">{t.customer.itemNote}</Label>
            <Input
              id="item-note"
              placeholder={t.customer.itemNotePlaceholder}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={140}
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <span className="font-medium">{t.customer.quantity}</span>
            {/* Big targets: this is used with one thumb, often standing up. */}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-11"
                aria-label={t.customer.decrease}
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
              >
                <Minus />
              </Button>
              <span className="w-10 text-center text-xl font-bold tabular-nums">
                {quantity}
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-11"
                aria-label={t.customer.increase}
                onClick={() => setQuantity((q) => Math.min(99, q + 1))}
              >
                <Plus />
              </Button>
            </div>
          </div>

          <Button
            className="h-12 w-full text-base"
            onClick={() => {
              onAdd(item, quantity, note);
              onOpenChange(false);
            }}
          >
            {t.customer.addToOrder}
            <span className="font-bold">
              {interpolate("{total}", {
                total: formatMoney(item.price * quantity, currency),
              })}
            </span>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
