"use client";

import { useState, useTransition } from "react";
import { Loader2, Pencil, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  deleteTable,
  regenerateQrToken,
  setTableActive,
} from "@/app/dashboard/tables/actions";
import { useT } from "@/components/i18n/i18n-provider";
import { TableDialog } from "@/components/tables/table-dialog";
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
import { interpolate } from "@/lib/i18n";
import type { Tables } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

export type RestaurantTable = Pick<
  Tables<"tables">,
  "id" | "table_number" | "label" | "qr_token" | "is_active"
>;

type Confirm =
  | { kind: "delete"; table: RestaurantTable }
  | { kind: "regenerate"; table: RestaurantTable }
  | null;

/**
 * `qrSlots` holds a server-rendered QR dialog per table id. Generating the SVG
 * on the server keeps the `qrcode` package out of the phone's bundle entirely.
 */
export function TableList({
  tables,
  qrSlots,
}: {
  tables: RestaurantTable[];
  qrSlots?: Record<string, React.ReactNode>;
}) {
  const t = useT();
  const [isPending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState<Confirm>(null);

  function toggleActive(table: RestaurantTable, isActive: boolean) {
    startTransition(async () => {
      const result = await setTableActive(table.id, isActive);
      if (!result.ok) toast.error(result.error);
      else toast.success(isActive ? t.tables.activated : t.tables.deactivated);
    });
  }

  function runConfirm() {
    if (!confirm) return;
    const { kind, table } = confirm;

    startTransition(async () => {
      const result =
        kind === "delete"
          ? await deleteTable(table.id)
          : await regenerateQrToken(table.id);

      if (!result.ok) toast.error(result.error);
      else
        toast.success(
          kind === "delete" ? t.tables.deleted : t.tables.regenerated
        );
      setConfirm(null);
    });
  }

  return (
    <>
      <ul className="divide-y rounded-lg border">
        {tables.map((table) => (
          <li
            key={table.id}
            className={cn(
              "flex items-center gap-3 p-3",
              !table.is_active && "bg-muted/40"
            )}
          >
            <span
              className={cn(
                "bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-md font-bold",
                !table.is_active && "bg-muted text-muted-foreground"
              )}
            >
              {table.table_number}
            </span>

            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">
                {table.label || `${t.tables.number} ${table.table_number}`}
                {!table.is_active && (
                  <span className="text-muted-foreground text-xs font-normal">
                    {" "}
                    — {t.common.hidden}
                  </span>
                )}
              </p>
              {/* The token is shown so staff can match a sticker to a row. */}
              <code
                className="text-muted-foreground font-mono text-xs"
                dir="ltr"
              >
                /t/{table.qr_token}
              </code>
            </div>

            <Switch
              checked={table.is_active ?? true}
              onCheckedChange={(checked) => toggleActive(table, checked)}
              disabled={isPending}
              aria-label={t.tables.activeSwitch}
            />

            {qrSlots?.[table.id]}

            <TableDialog
              table={table}
              trigger={
                <Button variant="ghost" size="icon" aria-label={t.tables.editTable}>
                  <Pencil className="size-4" />
                </Button>
              }
            />

            <Button
              variant="ghost"
              size="icon"
              aria-label={t.tables.regenerate}
              disabled={isPending}
              onClick={() => setConfirm({ kind: "regenerate", table })}
            >
              <RefreshCw className="size-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              aria-label={t.common.delete}
              className="text-destructive"
              disabled={isPending}
              onClick={() => setConfirm({ kind: "delete", table })}
            >
              <Trash2 className="size-4" />
            </Button>
          </li>
        ))}
      </ul>

      <Dialog
        open={confirm !== null}
        onOpenChange={(open) => !open && setConfirm(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirm &&
                interpolate(
                  confirm.kind === "delete"
                    ? t.tables.deleteTitle
                    : t.tables.regenerateTitle,
                  { number: confirm.table.table_number }
                )}
            </DialogTitle>
            <DialogDescription>
              {confirm?.kind === "delete"
                ? t.tables.deleteBody
                : t.tables.regenerateBody}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(null)}>
              {t.common.cancel}
            </Button>
            <Button
              variant={confirm?.kind === "delete" ? "destructive" : "default"}
              onClick={runConfirm}
              disabled={isPending}
            >
              {isPending && <Loader2 className="animate-spin" />}
              {confirm?.kind === "delete"
                ? t.common.delete
                : t.tables.regenerate}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
