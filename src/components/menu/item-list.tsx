"use client";

import { useOptimistic, useState, useTransition } from "react";
import Image from "next/image";
import { ChevronDown, ChevronUp, Copy, ImageOff, Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  deleteItem,
  duplicateItem,
  reorderItems,
  setItemAvailable,
} from "@/app/dashboard/menu/item-actions";
import { ItemDialog } from "@/components/menu/item-dialog";
import { useT } from "@/components/i18n/i18n-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import type { Tables } from "@/lib/supabase/types";
import { interpolate } from "@/lib/i18n";
import { formatMoney } from "@/lib/utils";
import { cn } from "@/lib/utils";

export type MenuItem = Pick<
  Tables<"menu_items">,
  | "id"
  | "name"
  | "name_secondary"
  | "description"
  | "price"
  | "image_url"
  | "is_available"
  | "sort_order"
>;

export function ItemList({
  items,
  restaurantId,
  categoryId,
}: {
  items: MenuItem[];
  restaurantId: string;
  categoryId: string | null;
}) {
  const t = useT();
  const [isPending, startTransition] = useTransition();
  const [pendingDelete, setPendingDelete] = useState<MenuItem | null>(null);
  const [order, setOrder] = useOptimistic(items);

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= order.length) return;

    const next = [...order];
    [next[index], next[target]] = [next[target], next[index]];

    startTransition(async () => {
      setOrder(next);
      const result = await reorderItems(next.map((item) => item.id));
      if (!result.ok) toast.error(result.error);
    });
  }

  function toggleAvailable(item: MenuItem, isAvailable: boolean) {
    startTransition(async () => {
      const result = await setItemAvailable(item.id, isAvailable);
      if (!result.ok) toast.error(result.error);
      else toast.success(isAvailable ? t.menu.itemAvailable : t.menu.itemSoldOut);
    });
  }

  function duplicate(item: MenuItem) {
    startTransition(async () => {
      const result = await duplicateItem(item.id);
      if (!result.ok) toast.error(result.error);
      else toast.success(t.menu.itemDuplicated);
    });
  }

  function confirmDelete() {
    if (!pendingDelete) return;
    const item = pendingDelete;

    startTransition(async () => {
      const result = await deleteItem(item.id);
      if (!result.ok) toast.error(result.error);
      else toast.success(t.menu.itemDeleted);
      setPendingDelete(null);
    });
  }

  if (order.length === 0) {
    return (
      <p className="text-muted-foreground px-3 py-4 text-sm">
        {t.menu.noItems}
      </p>
    );
  }

  return (
    <>
      <ul className="divide-y">
        {order.map((item, index) => (
          <li
            key={item.id}
            className={cn(
              "flex items-center gap-3 p-3",
              !item.is_available && "bg-muted/40"
            )}
          >
            <div className="flex flex-col">
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                aria-label={t.menu.moveItemUp}
                disabled={index === 0 || isPending}
                onClick={() => move(index, -1)}
              >
                <ChevronUp className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                aria-label={t.menu.moveItemDown}
                disabled={index === order.length - 1 || isPending}
                onClick={() => move(index, 1)}
              >
                <ChevronDown className="size-4" />
              </Button>
            </div>

            <div className="bg-muted relative size-12 shrink-0 overflow-hidden rounded-md">
              {item.image_url ? (
                <Image
                  src={item.image_url}
                  alt=""
                  fill
                  sizes="48px"
                  className={cn("object-cover", !item.is_available && "grayscale")}
                />
              ) : (
                <span className="text-muted-foreground flex size-full items-center justify-center">
                  <ImageOff className="size-4" />
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "truncate font-medium",
                  !item.is_available && "text-muted-foreground"
                )}
              >
                {item.name}
                {!item.is_available && (
                  <span className="text-destructive text-xs font-normal">
                    {" "}
                    — {t.menu.soldOut}
                  </span>
                )}
              </p>
              <p className="text-muted-foreground truncate text-sm">
                {formatMoney(Number(item.price))}
                {item.description ? ` · ${item.description}` : ""}
              </p>
            </div>

            <Switch
              checked={item.is_available ?? true}
              onCheckedChange={(checked) => toggleAvailable(item, checked)}
              disabled={isPending}
              aria-label={t.menu.availableForOrder}
            />

            <ItemDialog
              restaurantId={restaurantId}
              categoryId={categoryId}
              item={item}
              trigger={
                <Button variant="ghost" size="icon" aria-label={t.menu.editItem}>
                  <Pencil className="size-4" />
                </Button>
              }
            />

            <Button
              variant="ghost"
              size="icon"
              aria-label={t.menu.duplicateItem}
              disabled={isPending}
              onClick={() => duplicate(item)}
            >
              <Copy className="size-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              aria-label={t.common.delete}
              className="text-destructive"
              disabled={isPending}
              onClick={() => setPendingDelete(item)}
            >
              <Trash2 className="size-4" />
            </Button>
          </li>
        ))}
      </ul>

      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {interpolate(t.menu.deleteItemTitle, {
                name: pendingDelete?.name ?? "",
              })}
            </DialogTitle>
            <DialogDescription>
              {t.menu.deleteItemBody}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDelete(null)}>
              {t.common.cancel}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={isPending}
            >
              {isPending && <Loader2 className="animate-spin" />}
              {t.common.delete}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
