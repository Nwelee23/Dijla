"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createCategory, renameCategory } from "@/app/dashboard/menu/actions";
import { useT } from "@/components/i18n/i18n-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type CategoryDialogProps = {
  /** Omit to create; pass a category to rename it. */
  category?: { id: string; name: string };
  trigger: React.ReactNode;
};

export function CategoryDialog({ category, trigger }: CategoryDialogProps) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(category?.name ?? "");
  const [isPending, startTransition] = useTransition();

  const isRename = category !== undefined;

  function submit() {
    startTransition(async () => {
      const result = isRename
        ? await renameCategory(category.id, name)
        : await createCategory(name);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success(isRename ? t.menu.categoryRenamed : t.menu.categoryAdded);
      setOpen(false);
      if (!isRename) setName("");
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        // Reopening after a cancelled rename should show the saved name again.
        if (next) setName(category?.name ?? "");
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {isRename ? t.menu.editCategoryName : t.menu.newCategory}
          </DialogTitle>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="category-name">{t.menu.categoryName}</Label>
            <Input
              id="category-name"
              autoFocus
              required
              placeholder={t.menu.categoryPlaceholder}
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={isPending}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              {t.common.cancel}
            </Button>
            <Button type="submit" disabled={isPending || !name.trim()}>
              {isPending && <Loader2 className="animate-spin" />}
              {isRename ? t.common.save : t.common.add}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
