"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createItem, updateItem } from "@/app/dashboard/menu/item-actions";
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
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState(item?.name ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [price, setPrice] = useState(item ? String(item.price) : "");
  const [imageUrl, setImageUrl] = useState<string | null>(item?.image_url ?? null);

  const isEdit = item !== undefined;

  function reset() {
    setName(item?.name ?? "");
    setDescription(item?.description ?? "");
    setPrice(item ? String(item.price) : "");
    setImageUrl(item?.image_url ?? null);
  }

  function submit() {
    const input = {
      name,
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

      toast.success(isEdit ? "تم حفظ الصنف" : "تمت إضافة الصنف");
      setOpen(false);
      if (!isEdit) {
        setName("");
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
          <DialogTitle>{isEdit ? "تعديل الصنف" : "صنف جديد"}</DialogTitle>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="item-name">اسم الصنف</Label>
            <Input
              id="item-name"
              autoFocus
              required
              placeholder="مثال: كباب عراقي"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={isPending}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="item-price">السعر (دينار)</Label>
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
            <Label htmlFor="item-description">الوصف (اختياري)</Label>
            <Input
              id="item-description"
              placeholder="لحم غنم مشوي مع الخبز والسلطة"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              disabled={isPending}
            />
          </div>

          <div className="grid gap-2">
            <Label>صورة الصنف</Label>
            <ImageUpload
              value={imageUrl}
              onChange={setImageUrl}
              restaurantId={restaurantId}
              label="صورة"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit" disabled={isPending || !name.trim() || !price}>
              {isPending && <Loader2 className="animate-spin" />}
              {isEdit ? "حفظ" : "إضافة"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
