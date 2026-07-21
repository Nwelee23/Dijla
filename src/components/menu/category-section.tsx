"use client";

import { ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from "lucide-react";

import { CategoryDialog } from "@/components/menu/category-dialog";
import { ItemDialog } from "@/components/menu/item-dialog";
import { ItemList, type MenuItem } from "@/components/menu/item-list";
import { useT } from "@/components/i18n/i18n-provider";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { interpolate } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type Category = {
  id: string;
  name: string;
  is_active: boolean | null;
  sort_order: number | null;
};

export type CategoryWithItems = Category & { items: MenuItem[] };

export function CategorySection({
  category,
  restaurantId,
  isFirst,
  isLast,
  disabled,
  onMove,
  onToggleActive,
  onRequestDelete,
}: {
  category: CategoryWithItems;
  restaurantId: string;
  isFirst: boolean;
  isLast: boolean;
  disabled: boolean;
  onMove: (direction: -1 | 1) => void;
  onToggleActive: (isActive: boolean) => void;
  onRequestDelete: () => void;
}) {
  const t = useT();

  return (
    <section className="overflow-hidden rounded-lg border">
      <header
        className={cn(
          "flex items-center gap-2 border-b p-3",
          category.is_active ? "bg-muted/30" : "bg-muted/60"
        )}
      >
        <div className="flex flex-col">
          <Button
            variant="ghost"
            size="icon"
            className="size-6"
            aria-label={t.menu.moveCategoryUp}
            disabled={isFirst || disabled}
            onClick={() => onMove(-1)}
          >
            <ChevronUp className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-6"
            aria-label={t.menu.moveCategoryDown}
            disabled={isLast || disabled}
            onClick={() => onMove(1)}
          >
            <ChevronDown className="size-4" />
          </Button>
        </div>

        <h2
          className={cn(
            "min-w-0 flex-1 truncate font-semibold",
            !category.is_active && "text-muted-foreground"
          )}
        >
          {category.name}
          <span className="text-muted-foreground me-1 text-xs font-normal">
            {" "}
            ({category.items.length})
            {!category.is_active && ` — ${t.common.hidden}`}
          </span>
        </h2>

        <Switch
          checked={category.is_active ?? true}
          onCheckedChange={onToggleActive}
          disabled={disabled}
          aria-label={t.menu.showCategory}
        />

        <CategoryDialog
          category={category}
          trigger={
            <Button variant="ghost" size="icon" aria-label={t.menu.editCategoryName}>
              <Pencil className="size-4" />
            </Button>
          }
        />

        <Button
          variant="ghost"
          size="icon"
          aria-label={t.menu.deleteCategory}
          className="text-destructive"
          disabled={disabled}
          onClick={onRequestDelete}
        >
          <Trash2 className="size-4" />
        </Button>
      </header>

      <ItemList
        items={category.items}
        restaurantId={restaurantId}
        categoryId={category.id}
      />

      <div className="border-t p-2">
        <ItemDialog
          restaurantId={restaurantId}
          categoryId={category.id}
          trigger={
            <Button variant="ghost" size="sm" className="w-full">
              <Plus />
              {interpolate(t.menu.addItemTo, { name: category.name })}
            </Button>
          }
        />
      </div>
    </section>
  );
}
