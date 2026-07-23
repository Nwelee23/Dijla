"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createItem, updateItem } from "@/app/dashboard/menu/item-actions";
import { OptionGroupsEditor } from "@/components/menu/option-groups-editor";
import { useT } from "@/components/i18n/i18n-provider";
import { ImageUpload } from "@/components/shared/image-upload";
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
import type { MenuItem } from "@/components/menu/item-list";

type ItemDialogProps = {
  restaurantId: string;
  categoryId: string | null;
  /** Omit to create a new item. */
  item?: MenuItem;
  trigger: React.ReactNode;
};

export function ItemDialog({
  restaurantId,
  categoryId,
  item,
  trigger,
}: ItemDialogProps) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState(item?.name ?? "");
  const [nameSecondary, setNameSecondary] = useState(item?.name_secondary ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [price, setPrice] = useState(item ? String(item.price) : "");
  const [imageUrl, setImageUrl] = useState<string | null>(item?.image_url ?? null);

  const isEdit = item !== undefined;

  function reset() {
    setName(item?.name ?? "");
    setNameSecondary(item?.name_secondary ?? "");
    setDescription(item?.description ?? "");
    setPrice(item ? String(item.price) : "");
    setImageUrl(item?.image_url ?? null);
  }

  function submit() {
    const input = {
      name,
      nameSecondary,
      description,
      price: Number(price),
      imageUrl,
      categoryId,
    };

    startTransition(async () => {
      const result = isEdit
        ? await updateItem(item.id, input)
        : await createItem(input);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success(isEdit ? t.menu.itemSaved : t.menu.itemAdded);
      setOpen(false);
      if (!isEdit) {
        setName("");
        setNameSecondary("");
        setDescription("");
        setPrice("");
        setImageUrl(null);
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) reset();
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? t.menu.editItem : t.menu.newItem}</DialogTitle>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="item-name">{t.menu.itemName}</Label>
            <Input
              id="item-name"
              autoFocus
              required
              placeholder={t.menu.itemNamePlaceholder}
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={isPending}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="item-name-secondary">
              {t.menu.itemNameSecondary} ({t.common.optional})
            </Label>
            <Input
              id="item-name-secondary"
              placeholder={t.menu.itemNameSecondaryPlaceholder}
              value={nameSecondary}
              onChange={(event) => setNameSecondary(event.target.value)}
              disabled={isPending}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="item-price">{t.menu.itemPrice}</Label>
            <Input
              id="item-price"
              type="number"
              inputMode="numeric"
              required
              min={0}
              // Iraqi menu prices move in 250s, never in fils.
              step={250}
              dir="ltr"
              placeholder="15000"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              disabled={isPending}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="item-description">
              {t.common.description} ({t.common.optional})
            </Label>
            <Input
              id="item-description"
              placeholder={t.menu.itemDescriptionPlaceholder}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              disabled={isPending}
            />
          </div>

          <div className="grid gap-2">
            <Label>{t.menu.itemImage}</Label>
            <ImageUpload
              value={imageUrl}
              onChange={setImageUrl}
              restaurantId={restaurantId}
            />
          </div>

          {/* Options need an existing item to hang off, and name+price is enough
              to save (§5), so they appear only when editing. */}
          {isEdit ? (
            <OptionGroupsEditor itemId={item.id} />
          ) : (
            <p className="text-muted-foreground text-xs">{t.menu.optionsAfterSave}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button type="submit" disabled={isPending || !name.trim() || !price}>
              {isPending && <Loader2 className="animate-spin" />}
              {isEdit ? t.common.save : t.common.add}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
