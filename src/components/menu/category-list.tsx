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
import { Button } from "@/components/ui/button";
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
      else toast.success(isActive ? "تم إظهار التصنيف" : "تم إخفاء التصنيف");
    });
  }

  function confirmDelete() {
    if (!pendingDelete) return;
    const category = pendingDelete;

    startTransition(async () => {
      const result = await deleteCategory(category.id);
      if (!result.ok) toast.error(result.error);
      else toast.success("تم حذف التصنيف");
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
            <DialogTitle>حذف «{pendingDelete?.name}»؟</DialogTitle>
            <DialogDescription>
              {pendingDelete && pendingDelete.items.length > 0
                ? `الأصناف الـ ${pendingDelete.items.length} داخل هذا التصنيف لن تُحذف، لكنها ستنتقل إلى «بدون تصنيف». إذا كنت تريد إخفاءه مؤقتاً فقط، استخدم مفتاح الإظهار بدلاً من الحذف.`
                : "إذا كنت تريد إخفاءه مؤقتاً فقط، استخدم مفتاح الإظهار بدلاً من الحذف."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDelete(null)}>
              إلغاء
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={isPending}
            >
              {isPending && <Loader2 className="animate-spin" />}
              حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
