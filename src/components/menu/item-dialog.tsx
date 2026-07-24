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
import { interpolate } from "@/lib/i18n";
import { MENU_TAGS, sanitizeTags, type MenuTag } from "@/lib/menu-tags";
import { cn } from "@/lib/utils";

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
  const [nameFa, setNameFa] = useState(item?.name_fa ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [descriptionSecondary, setDescriptionSecondary] = useState(
    item?.description_secondary ?? ""
  );
  const [descriptionFa, setDescriptionFa] = useState(item?.description_fa ?? "");
  const [price, setPrice] = useState(item ? String(item.price) : "");
  const [cost, setCost] = useState(item?.cost != null ? String(item.cost) : "");
  const [imageUrl, setImageUrl] = useState<string | null>(item?.image_url ?? null);
  const [tags, setTags] = useState<MenuTag[]>(sanitizeTags(item?.tags ?? []));
  const [prep, setPrep] = useState(
    item?.prep_minutes != null ? String(item.prep_minutes) : ""
  );
  // Default true (auto-restore on); false pins the item "نفد بشكل دائم".
  const [autoRestore, setAutoRestore] = useState(item?.auto_restore ?? true);

  const isEdit = item !== undefined;

  function reset() {
    setName(item?.name ?? "");
    setNameSecondary(item?.name_secondary ?? "");
    setNameFa(item?.name_fa ?? "");
    setDescription(item?.description ?? "");
    setDescriptionSecondary(item?.description_secondary ?? "");
    setDescriptionFa(item?.description_fa ?? "");
    setPrice(item ? String(item.price) : "");
    setCost(item?.cost != null ? String(item.cost) : "");
    setImageUrl(item?.image_url ?? null);
    setTags(sanitizeTags(item?.tags ?? []));
    setPrep(item?.prep_minutes != null ? String(item.prep_minutes) : "");
    setAutoRestore(item?.auto_restore ?? true);
  }

  function toggleTag(tag: MenuTag) {
    setTags((current) =>
      current.includes(tag)
        ? current.filter((value) => value !== tag)
        : [...current, tag]
    );
  }

  function submit() {
    const input = {
      name,
      nameSecondary,
      nameFa,
      description,
      descriptionSecondary,
      descriptionFa,
      price: Number(price),
      imageUrl,
      categoryId,
      tags,
      prepMinutes: prep.trim() ? Number(prep) : null,
      autoRestore,
      cost: cost.trim() ? Number(cost) : null,
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
        setTags([]);
        setPrep("");
        setAutoRestore(true);
        setCost("");
        setNameFa("");
        setDescriptionSecondary("");
        setDescriptionFa("");
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

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="item-name-en">
                {t.menu.itemNameEn} ({t.common.optional})
              </Label>
              <Input
                id="item-name-en"
                dir="ltr"
                placeholder={t.menu.itemNameEnPlaceholder}
                value={nameSecondary}
                onChange={(event) => setNameSecondary(event.target.value)}
                disabled={isPending}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="item-name-fa">
                {t.menu.itemNameFa} ({t.common.optional})
              </Label>
              <Input
                id="item-name-fa"
                dir="rtl"
                placeholder={t.menu.itemNameFaPlaceholder}
                value={nameFa}
                onChange={(event) => setNameFa(event.target.value)}
                disabled={isPending}
              />
            </div>
          </div>

          <p className="text-muted-foreground flex items-center gap-2 text-xs">
            <span>{t.menu.translations}:</span>
            <span className="text-brand font-medium">ع</span>
            <span className={nameSecondary.trim() ? "text-brand font-medium" : "opacity-50"}>
              En
            </span>
            <span className={nameFa.trim() ? "text-brand font-medium" : "opacity-50"}>
              فا
            </span>
          </p>

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
            <Label htmlFor="item-cost">
              {t.menu.itemCost} ({t.common.optional})
            </Label>
            <Input
              id="item-cost"
              type="number"
              inputMode="numeric"
              min={0}
              step={250}
              dir="ltr"
              placeholder="8000"
              value={cost}
              onChange={(event) => setCost(event.target.value)}
              disabled={isPending}
            />
            <p className="text-muted-foreground text-xs">{t.menu.itemCostHint}</p>
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

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="item-desc-en">{t.menu.itemDescriptionEn}</Label>
              <Input
                id="item-desc-en"
                dir="ltr"
                value={descriptionSecondary}
                onChange={(event) => setDescriptionSecondary(event.target.value)}
                disabled={isPending}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="item-desc-fa">{t.menu.itemDescriptionFa}</Label>
              <Input
                id="item-desc-fa"
                dir="rtl"
                value={descriptionFa}
                onChange={(event) => setDescriptionFa(event.target.value)}
                disabled={isPending}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="item-prep">
                {t.menu.itemPrepMinutes} ({t.common.optional})
              </Label>
              <Input
                id="item-prep"
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                dir="ltr"
                placeholder={t.menu.itemPrepMinutesPlaceholder}
                value={prep}
                onChange={(event) => setPrep(event.target.value)}
                disabled={isPending}
              />
              {/* Learned median new→ready (§D.2): a suggestion, never forced. */}
              {item?.learnedPrep && (
                <button
                  type="button"
                  onClick={() => setPrep(String(item.learnedPrep!.median))}
                  disabled={isPending}
                  className="text-muted-foreground hover:text-foreground text-start text-xs underline-offset-2 hover:underline"
                >
                  {interpolate(t.menu.itemPrepLearned, {
                    minutes: item.learnedPrep.median,
                  })}
                </button>
              )}
            </div>

            <div className="grid gap-2">
              <Label>
                {t.menu.itemTags} ({t.common.optional})
              </Label>
              <div className="flex flex-wrap gap-2 pt-1">
                {MENU_TAGS.map((tag) => {
                  const on = tags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      aria-pressed={on}
                      disabled={isPending}
                      className={cn(
                        "rounded-full border px-3 py-1 text-sm transition-colors",
                        on
                          ? "border-brand bg-brand text-brand-foreground"
                          : "hover:bg-accent"
                      )}
                    >
                      {t.menu.tags[tag]}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid gap-2">
            <Label>{t.menu.itemImage}</Label>
            <ImageUpload
              value={imageUrl}
              onChange={setImageUrl}
              restaurantId={restaurantId}
            />
          </div>

          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 size-4 accent-[var(--brand)]"
              checked={!autoRestore}
              onChange={(event) => setAutoRestore(!event.target.checked)}
              disabled={isPending}
            />
            <span>
              <span className="font-medium">{t.menu.permanentSoldOut}</span>
              <span className="text-muted-foreground block text-xs">
                {t.menu.permanentSoldOutHint}
              </span>
            </span>
          </label>

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
