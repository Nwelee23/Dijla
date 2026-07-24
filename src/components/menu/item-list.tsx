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
  setItemsAvailable,
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
import { sanitizeTags } from "@/lib/menu-tags";
import type { Tables } from "@/lib/supabase/types";
import { interpolate } from "@/lib/i18n";
import { formatMoney } from "@/lib/utils";
import { cn } from "@/lib/utils";

export type MenuItem = Pick<
  Tables<"menu_items">,
  | "id"
  | "name"
  | "name_secondary"
  | "name_fa"
  | "description"
  | "description_secondary"
  | "description_fa"
  | "price"
  | "image_url"
  | "is_available"
  | "sort_order"
  | "tags"
  | "prep_minutes"
  | "auto_restore"
  | "cost"
> & {
  /**
   * Learned median prep minutes (§D.2), attached by the menu page from the
   * `learned_prep_minutes` RPC. Null until there is a trustworthy sample.
   */
  learnedPrep?: { median: number; sample: number } | null;
};

/** Per-item option counts for the card meta: options in single vs multi groups. */
export type OptionCounts = Record<string, { sizes: number; extras: number }>;

export function ItemList({
  items,
  restaurantId,
  categoryId,
  optionCounts = {},
}: {
  items: MenuItem[];
  restaurantId: string;
  categoryId: string | null;
  optionCounts?: OptionCounts;
}) {
  const t = useT();
  const [isPending, startTransition] = useTransition();
  const [pendingDelete, setPendingDelete] = useState<MenuItem | null>(null);
  const [order, setOrder] = useOptimistic(items);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggleSelected(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function bulkSet(isAvailable: boolean) {
    const ids = [...selected];
    startTransition(async () => {
      const result = await setItemsAvailable(ids, isAvailable);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(isAvailable ? t.menu.itemAvailable : t.menu.itemSoldOut);
      setSelected(new Set());
      setSelectMode(false);
    });
  }

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
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        {selectMode && selected.size > 0 ? (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">
              {interpolate(t.menu.selectedCount, { count: selected.size })}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={() => bulkSet(false)}
            >
              {t.menu.markSoldOut}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={() => bulkSet(true)}
            >
              {t.menu.markAvailable}
            </Button>
          </div>
        ) : (
          <span />
        )}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setSelectMode((on) => !on);
            setSelected(new Set());
          }}
        >
          {selectMode ? t.common.cancel : t.menu.selectItems}
        </Button>
      </div>

      <ul className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2">
        {order.map((item, index) => {
          const soldOut = !item.is_available;
          const tags = sanitizeTags(item.tags);
          const meta = optionCounts[item.id];
          const metaLabel = meta
            ? [
                meta.sizes > 0 && interpolate(t.menu.metaSizes, { count: meta.sizes }),
                meta.extras > 0 &&
                  interpolate(t.menu.metaExtras, { count: meta.extras }),
              ]
                .filter(Boolean)
                .join(" · ")
            : "";
          return (
            <li
              key={item.id}
              className={cn(
                "overflow-hidden rounded-xl border",
                soldOut && "bg-muted/40"
              )}
            >
              {/* Photo-forward, mirroring the customer card (§7.1). */}
              <div className="bg-muted relative aspect-[16/10]">
                {item.image_url ? (
                  <Image
                    src={item.image_url}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 100vw, 320px"
                    className={cn("object-cover", soldOut && "grayscale")}
                  />
                ) : (
                  <span className="text-muted-foreground flex size-full items-center justify-center">
                    <ImageOff className="size-6" />
                  </span>
                )}

                {selectMode && (
                  <input
                    type="checkbox"
                    className="absolute end-2 top-2 size-5 accent-[var(--brand)]"
                    checked={selected.has(item.id)}
                    onChange={() => toggleSelected(item.id)}
                    aria-label={item.name}
                  />
                )}

                {soldOut && (
                  <span className="bg-destructive absolute start-2 top-2 rounded-full px-2 py-0.5 text-xs font-medium text-white">
                    {t.menu.soldOut}
                  </span>
                )}

                {!soldOut && tags.length > 0 && (
                  <div className="absolute bottom-2 start-2 flex flex-wrap gap-1">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="bg-background/85 text-foreground rounded-full px-2 py-0.5 text-xs font-medium backdrop-blur"
                      >
                        {t.menu.tags[tag]}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p
                      className={cn(
                        "truncate font-medium",
                        soldOut && "text-muted-foreground"
                      )}
                    >
                      {item.name}
                    </p>
                    <p className="text-muted-foreground text-sm tabular-nums">
                      {formatMoney(Number(item.price))}
                    </p>
                  </div>
                  <Switch
                    checked={item.is_available ?? true}
                    onCheckedChange={(checked) => toggleAvailable(item, checked)}
                    disabled={isPending}
                    aria-label={t.menu.availableForOrder}
                  />
                </div>

                {item.description && (
                  <p className="text-muted-foreground line-clamp-2 text-sm">
                    {item.description}
                  </p>
                )}

                {metaLabel && (
                  <p className="text-muted-foreground text-xs">{metaLabel}</p>
                )}

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    aria-label={t.menu.moveItemUp}
                    disabled={index === 0 || isPending}
                    onClick={() => move(index, -1)}
                  >
                    <ChevronUp className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    aria-label={t.menu.moveItemDown}
                    disabled={index === order.length - 1 || isPending}
                    onClick={() => move(index, 1)}
                  >
                    <ChevronDown className="size-4" />
                  </Button>

                  <span className="flex-1" />

                  <ItemDialog
                    restaurantId={restaurantId}
                    categoryId={categoryId}
                    item={item}
                    trigger={
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        aria-label={t.menu.editItem}
                      >
                        <Pencil className="size-4" />
                      </Button>
                    }
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    aria-label={t.menu.duplicateItem}
                    disabled={isPending}
                    onClick={() => duplicate(item)}
                  >
                    <Copy className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive size-8"
                    aria-label={t.common.delete}
                    disabled={isPending}
                    onClick={() => setPendingDelete(item)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            </li>
          );
        })}
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
