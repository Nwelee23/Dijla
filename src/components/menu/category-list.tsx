"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  deleteCategory,
  reorderCategories,
  setCategoryActive,
} from "@/app/dashboard/menu/actions";
import {
  CategorySection,
  type CategoryWithItems,
} from "@/components/menu/category-section";
import { useT } from "@/components/i18n/i18n-provider";
import { Button } from "@/components/ui/button";
import { interpolate } from "@/lib/i18n";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type { CategoryWithItems };

export function CategoryList({
  categories,
  restaurantId,
}: {
  categories: CategoryWithItems[];
  restaurantId: string;
}) {
  const t = useT();
  const [isPending, startTransition] = useTransition();
  const [pendingDelete, setPendingDelete] = useState<CategoryWithItems | null>(
    null
  );

  // Reordering feels instant; the server call reconciles behind it.
  const [order, setOrder] = useOptimistic(categories);

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= order.length) return;

    const next = [...order];
    [next[index], next[target]] = [next[target], next[index]];

    startTransition(async () => {
      setOrder(next);
      const result = await reorderCategories(next.map((item) => item.id));
      if (!result.ok) toast.error(result.error);
    });
  }

  function toggleActive(id: string, isActive: boolean) {
    startTransition(async () => {
      const result = await setCategoryActive(id, isActive);
      if (!result.ok) toast.error(result.error);
      else
        toast.success(
          isActive ? t.menu.categoryShown : t.menu.categoryHiddenToast
        );
    });
  }

  function confirmDelete() {
    if (!pendingDelete) return;
    const category = pendingDelete;

    startTransition(async () => {
      const result = await deleteCategory(category.id);
      if (!result.ok) toast.error(result.error);
      else toast.success(t.menu.categoryDeleted);
      setPendingDelete(null);
    });
  }

  return (
    <>
      <div className="space-y-4">
        {order.map((category, index) => (
          <CategorySection
            key={category.id}
            category={category}
            restaurantId={restaurantId}
            isFirst={index === 0}
            isLast={index === order.length - 1}
            disabled={isPending}
            onMove={(direction) => move(index, direction)}
            onToggleActive={(isActive) => toggleActive(category.id, isActive)}
            onRequestDelete={() => setPendingDelete(category)}
          />
        ))}
      </div>

      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {interpolate(t.menu.deleteCategoryTitle, {
                name: pendingDelete?.name ?? "",
              })}
            </DialogTitle>
            <DialogDescription>
              {pendingDelete && pendingDelete.items.length > 0
                ? interpolate(t.menu.deleteCategoryWithItems, {
                    count: pendingDelete.items.length,
                  })
                : t.menu.deleteCategoryEmpty}
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
