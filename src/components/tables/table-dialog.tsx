"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createTable, updateTable } from "@/app/dashboard/tables/actions";
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

type TableDialogProps = {
  /** Omit to create a new table. */
  table?: { id: string; table_number: string; label: string | null };
  trigger: React.ReactNode;
};

export function TableDialog({ table, trigger }: TableDialogProps) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [number, setNumber] = useState(table?.table_number ?? "");
  const [label, setLabel] = useState(table?.label ?? "");

  const isEdit = table !== undefined;

  function submit() {
    startTransition(async () => {
      const result = isEdit
        ? await updateTable(table.id, number, label)
        : await createTable(number, label);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success(isEdit ? t.tables.saved : t.tables.added);
      setOpen(false);
      if (!isEdit) {
        setNumber("");
        setLabel("");
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setNumber(table?.table_number ?? "");
          setLabel(table?.label ?? "");
        }
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t.tables.editTable : t.tables.newTable}
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
            <Label htmlFor="table-number">{t.tables.number}</Label>
            <Input
              id="table-number"
              autoFocus
              required
              placeholder={t.tables.numberPlaceholder}
              value={number}
              onChange={(event) => setNumber(event.target.value)}
              disabled={isPending}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="table-label">{t.tables.label}</Label>
            <Input
              id="table-label"
              placeholder={t.tables.labelPlaceholder}
              value={label}
              onChange={(event) => setLabel(event.target.value)}
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
            <Button type="submit" disabled={isPending || !number.trim()}>
              {isPending && <Loader2 className="animate-spin" />}
              {isEdit ? t.common.save : t.common.add}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
