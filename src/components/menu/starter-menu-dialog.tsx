"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { importStarterMenu } from "@/app/dashboard/menu/actions";
import { useT } from "@/components/i18n/i18n-provider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { interpolate } from "@/lib/i18n";
import { templateItemCount, templateKeys } from "@/lib/menu-templates";

/**
 * Pick a starter menu to import (MENU_BUILDER_SPEC §2.1). Any owner can choose
 * any template — the signup type is a hint, not a cage — and everything imported
 * is editable afterwards.
 */
export function StarterMenuDialog({ trigger }: { trigger: React.ReactNode }) {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function importTemplate(key: string) {
    setPendingKey(key);
    startTransition(async () => {
      const result = await importStarterMenu(key);
      if (!result.ok) {
        toast.error(result.error);
        setPendingKey(null);
        return;
      }
      toast.success(t.menu.templateImported);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.menu.starterMenuTitle}</DialogTitle>
          <DialogDescription>{t.menu.starterMenuHint}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-2">
          {templateKeys().map((key) => (
            <button
              key={key}
              type="button"
              disabled={isPending}
              onClick={() => importTemplate(key)}
              className="hover:bg-accent flex items-center justify-between gap-3 rounded-lg border p-3 text-start transition-colors disabled:opacity-60"
            >
              <span className="font-medium">
                {t.restaurantTypes[key as keyof typeof t.restaurantTypes]}
              </span>
              <span className="text-muted-foreground flex items-center gap-2 text-sm">
                {interpolate(t.menu.itemsCount, { count: templateItemCount(key) })}
                {isPending && pendingKey === key && <Loader2 className="size-4 animate-spin" />}
              </span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
