"use client";

import { useMemo, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createItemsFromLines } from "@/app/dashboard/menu/item-actions";
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
import { interpolate } from "@/lib/i18n";
import { parseMenuLines } from "@/lib/menu-lines";
import { formatMoney } from "@/lib/utils";

/**
 * Paste a whole menu at once (§7.4): one dish per line with the price at the
 * end. The parsed rows are previewed live so the owner sees exactly what will be
 * created before committing. Only name + price — photos and options come later.
 */
export function PasteLinesDialog({
  categoryId,
  trigger,
}: {
  categoryId: string | null;
  trigger: React.ReactNode;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [isPending, startTransition] = useTransition();

  const parsed = useMemo(() => parseMenuLines(text), [text]);

  function submit() {
    startTransition(async () => {
      const result = await createItemsFromLines(categoryId, parsed.valid);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(
        interpolate(t.menu.pasteCreated, { count: parsed.valid.length })
      );
      setText("");
      setOpen(false);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setText("");
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t.menu.pasteLines}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-muted-foreground text-sm">{t.menu.pasteLinesHint}</p>

          <textarea
            autoFocus
            rows={8}
            dir="auto"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={t.menu.pasteLinesPlaceholder}
            disabled={isPending}
            className="border-input bg-background focus-visible:ring-ring w-full rounded-md border p-3 text-sm focus-visible:ring-2 focus-visible:outline-none"
          />

          {parsed.valid.length > 0 && (
            <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border p-2">
              {parsed.valid.map((line, index) => (
                <div
                  key={`${index}-${line.name}`}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span className="truncate">{line.name}</span>
                  <span className="text-muted-foreground shrink-0 tabular-nums">
                    {formatMoney(line.price)}
                  </span>
                </div>
              ))}
            </div>
          )}

          <p className="text-muted-foreground text-xs">
            {interpolate(t.menu.pastePreview, { count: parsed.valid.length })}
            {parsed.invalid > 0 &&
              ` · ${interpolate(t.menu.pasteInvalid, { count: parsed.invalid })}`}
          </p>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            {t.common.cancel}
          </Button>
          <Button
            type="button"
            disabled={isPending || parsed.valid.length === 0}
            onClick={submit}
          >
            {isPending && <Loader2 className="animate-spin" />}
            {interpolate(t.menu.pasteCreate, { count: parsed.valid.length })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
