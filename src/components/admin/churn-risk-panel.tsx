"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, Phone, PhoneCall } from "lucide-react";
import { toast } from "sonner";

import { logOutreach } from "@/app/admin/actions";
import { useT } from "@/components/i18n/i18n-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ChurnRow } from "@/lib/churn";
import { interpolate } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type { ChurnRow };

/**
 * Churn-risk workflow (UX_IMPROVEMENTS_SPEC §A.3): restaurants gone quiet, with
 * risk tiers, tap-to-call, and a recorded outreach so the same one isn't chased
 * twice. Calling before a restaurant decides to cancel is the cheapest revenue
 * to protect.
 */
export function ChurnRiskPanel({ rows }: { rows: ChurnRow[] }) {
  const t = useT();
  const [noteFor, setNoteFor] = useState<ChurnRow | null>(null);
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit() {
    if (!noteFor) return;
    const target = noteFor;
    startTransition(async () => {
      const result = await logOutreach(target.id, note);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(t.admin.churn.logged);
      setNoteFor(null);
      setNote("");
    });
  }

  if (rows.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-lg font-bold">
        <AlertTriangle className="text-warning size-5" />
        {t.admin.churn.title}
        <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs font-bold tabular-nums">
          {rows.length}
        </span>
      </h2>

      <ul className="space-y-2">
        {rows.map((row) => {
          const critical = row.daysDormant >= 14;
          return (
            <li
              key={row.id}
              className={cn(
                "flex flex-wrap items-center gap-3 rounded-xl border p-3",
                critical ? "border-danger/50" : "border-warning/50"
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium">{row.name}</p>
                <p className="text-muted-foreground text-xs">
                  {row.area ? `${row.area} · ` : ""}
                  {interpolate(t.admin.churn.quietFor, { days: row.daysDormant })}
                  {` · ${row.tier} · ${row.status}`}
                  {` · ${interpolate(t.admin.churn.lifetimeN, { count: row.lifetimeOrders })}`}
                </p>
                {row.lastOutreachAt && (
                  <p className="text-brand text-xs">
                    {interpolate(t.admin.churn.contactedOn, {
                      date: row.lastOutreachAt.slice(0, 10),
                    })}
                  </p>
                )}
              </div>

              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-bold",
                  critical
                    ? "bg-danger/15 text-danger"
                    : "bg-warning/15 text-warning"
                )}
              >
                {critical ? t.admin.churn.critical : t.admin.churn.warning}
              </span>

              {row.phone && (
                <Button asChild variant="outline" size="sm">
                  <a href={`tel:${row.phone}`}>
                    <Phone className="size-3.5" />
                    {t.admin.churn.call}
                  </a>
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setNoteFor(row);
                  setNote("");
                }}
              >
                <PhoneCall className="size-3.5" />
                {t.admin.churn.logOutreach}
              </Button>
            </li>
          );
        })}
      </ul>

      <Dialog open={noteFor !== null} onOpenChange={(open) => !open && setNoteFor(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{noteFor?.name}</DialogTitle>
          </DialogHeader>
          <textarea
            rows={3}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={t.admin.churn.notePlaceholder}
            disabled={isPending}
            className="border-input bg-background focus-visible:ring-ring w-full rounded-md border p-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteFor(null)} disabled={isPending}>
              {t.common.cancel}
            </Button>
            <Button onClick={submit} disabled={isPending}>
              {t.admin.churn.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
