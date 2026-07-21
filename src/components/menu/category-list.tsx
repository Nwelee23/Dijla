"use client";

import { useOptimistic, useState, useTransition } from "react";
import { ChevronDown, ChevronUp, Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  deleteCategory,
  reorderCategories,
  setCategoryActive,
} from "@/app/dashboard/menu/actions";
import { CategoryDialog } from "@/components/menu/category-dialog";
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
import { cn } from "@/lib/utils";

export type Category = Pick<
  Tables<"menu_categories">,
  "id" | "name" | "is_active" | "sort_order"
>;

export function CategoryList({ categories }: { categories: Category[] }) {
  const [isPending, startTransition] = useTransition();
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null);

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

  function toggleActive(category: Category, isActive: boolean) {
    startTransition(async () => {
      const result = await setCategoryActive(category.id, isActive);
      if (!result.ok) toast.error(result.error);
      else toast.success(isActive ? "تم تفعيل التصنيف" : "تم إخفاء التصنيف");
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
      <ul className="divide-y rounded-lg border">
        {order.map((category, index) => (
          <li
            key={category.id}
            className={cn(
              "flex items-center gap-2 p-3",
              !category.is_active && "bg-muted/40"
            )}
          >
            <div className="flex flex-col">
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                aria-label="تحريك لأعلى"
                disabled={index === 0 || isPending}
                onClick={() => move(index, -1)}
              >
                <ChevronUp className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                aria-label="تحريك لأسفل"
                disabled={index === order.length - 1 || isPending}
                onClick={() => move(index, 1)}
              >
                <ChevronDown className="size-4" />
              </Button>
            </div>

            <span
              className={cn(
                "min-w-0 flex-1 truncate font-medium",
                !category.is_active && "text-muted-foreground"
              )}
            >
              {category.name}
              {!category.is_active && (
                <span className="text-muted-foreground me-2 text-xs font-normal">
                  {" "}
                  — مخفي
                </span>
              )}
            </span>

            <Switch
              checked={category.is_active ?? true}
              onCheckedChange={(checked) => toggleActive(category, checked)}
              disabled={isPending}
              aria-label="تفعيل التصنيف"
            />

            <CategoryDialog
              category={category}
              trigger={
                <Button variant="ghost" size="icon" aria-label="تعديل الاسم">
                  <Pencil className="size-4" />
                </Button>
              }
            />

            <Button
              variant="ghost"
              size="icon"
              aria-label="حذف التصنيف"
              className="text-destructive"
              disabled={isPending}
              onClick={() => setPendingDelete(category)}
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
            <DialogTitle>حذف «{pendingDelete?.name}»؟</DialogTitle>
            <DialogDescription>
              الأصناف داخل هذا التصنيف لن تُحذف، لكنها ستصبح بدون تصنيف. إذا كنت
              تريد إخفاءه مؤقتاً فقط، استخدم مفتاح التفعيل بدلاً من الحذف.
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
