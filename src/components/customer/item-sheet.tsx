"use client";

import { useState } from "react";
import Image from "next/image";
import { Check, ImageOff, Minus, Plus } from "lucide-react";

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
import type { MenuItem, MenuOption } from "@/lib/menu";
import { cn, formatMoney } from "@/lib/utils";

/**
 * Bottom sheet for one dish: photo, description, option groups, quantity, note.
 *
 * Option groups (size, extras) are chosen here (MENU_BUILDER_SPEC §4). A
 * single-choice group (max_select = 1) behaves like radios; a multi group like
 * checkboxes capped at max_select. A required group must have a choice before
 * the dish can be added, and the price updates live with the selected deltas.
 * The server re-reads and re-prices every option, so this is display + intent.
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
  onAdd: (item: MenuItem, quantity: number, note: string, options: MenuOption[]) => void;
}) {
  const t = useT();
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  // groupId -> selected option ids
  const [selected, setSelected] = useState<Record<string, string[]>>({});

  function handleOpenChange(next: boolean) {
    if (next) {
      setQuantity(1);
      setNote("");
      setSelected({});
    }
    onOpenChange(next);
  }

  if (!item) return null;

  function toggle(groupId: string, optionId: string, maxSelect: number) {
    setSelected((current) => {
      const chosen = current[groupId] ?? [];
      if (maxSelect <= 1) {
        // Single choice: tapping the chosen one clears it (unless required — the
        // gate below still blocks add), tapping another replaces it.
        return { ...current, [groupId]: chosen[0] === optionId ? [] : [optionId] };
      }
      if (chosen.includes(optionId)) {
        return { ...current, [groupId]: chosen.filter((id) => id !== optionId) };
      }
      if (chosen.length >= maxSelect) return current; // cap reached
      return { ...current, [groupId]: [...chosen, optionId] };
    });
  }

  const groups = item.optionGroups;
  const chosenOptions: MenuOption[] = groups.flatMap((group) =>
    (selected[group.id] ?? [])
      .map((id) => group.options.find((o) => o.id === id))
      .filter((o): o is MenuOption => o !== undefined)
  );
  const extra = chosenOptions.reduce((sum, o) => sum + o.priceDelta, 0);
  const unit = item.price + extra;
  const requiredSatisfied = groups.every(
    (group) => !group.isRequired || (selected[group.id]?.length ?? 0) > 0
  );

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto">
        <SheetHeader className="text-start">
          <SheetTitle className="text-xl">{item.name}</SheetTitle>
          {item.description && (
            <SheetDescription className="text-base">{item.description}</SheetDescription>
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

          {groups.map((group) => {
            const chosen = selected[group.id] ?? [];
            return (
              <div key={group.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{group.name}</p>
                  <span className="text-muted-foreground text-xs">
                    {group.isRequired
                      ? t.customer.required
                      : group.maxSelect > 1
                        ? interpolate(t.customer.chooseUpTo, { count: group.maxSelect })
                        : t.customer.optional}
                  </span>
                </div>
                <div className="grid gap-2">
                  {group.options.map((option) => {
                    const isOn = chosen.includes(option.id);
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => toggle(group.id, option.id, group.maxSelect)}
                        className={cn(
                          "flex items-center justify-between gap-2 rounded-lg border p-3 text-start transition-colors",
                          isOn ? "border-primary bg-primary/5" : "hover:bg-accent"
                        )}
                      >
                        <span className="flex items-center gap-2">
                          <span
                            className={cn(
                              "flex size-5 items-center justify-center rounded-full border",
                              isOn && "border-primary bg-primary text-primary-foreground"
                            )}
                          >
                            {isOn && <Check className="size-3.5" />}
                          </span>
                          {option.name}
                        </span>
                        {option.priceDelta > 0 && (
                          <span className="text-muted-foreground text-sm tabular-nums" dir="ltr">
                            +{formatMoney(option.priceDelta, currency)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

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
              <span className="w-10 text-center text-xl font-bold tabular-nums">{quantity}</span>
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
            disabled={!requiredSatisfied}
            onClick={() => {
              onAdd(item, quantity, note, chosenOptions);
              onOpenChange(false);
            }}
          >
            {requiredSatisfied ? t.customer.addToOrder : t.customer.chooseRequired}
            {requiredSatisfied && (
              <span className="font-bold">
                {formatMoney(unit * quantity, currency)}
              </span>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
