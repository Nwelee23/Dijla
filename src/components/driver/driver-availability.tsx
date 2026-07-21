"use client";

import { useState, useTransition } from "react";
import { Circle, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { setAvailability } from "@/app/driver/actions";
import { useT } from "@/components/i18n/i18n-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The driver's working switch: available or off.
 *
 * `busy` is shown but not tappable — it is set for the length of a run, so while
 * a driver is out this reads "busy" and the toggle waits. The optimistic flip
 * keeps a tap feeling instant on a slow connection; a failure rolls it back.
 */
export function DriverAvailability({ status }: { status: string }) {
  const t = useT();
  const [isPending, startTransition] = useTransition();
  const [local, setLocal] = useState(status);

  const isBusy = local === "busy";
  const isAvailable = local === "available";

  function toggle() {
    if (isBusy) return;
    const next = isAvailable ? "offline" : "available";
    const previous = local;
    setLocal(next);
    startTransition(async () => {
      const result = await setAvailability(next);
      if (!result.ok) {
        setLocal(previous);
        toast.error(result.error);
      }
    });
  }

  const label =
    t.drivers.status[local as keyof typeof t.drivers.status] ?? local;

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggle}
      disabled={isPending || isBusy}
      className="gap-1.5"
    >
      {isPending ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <Circle
          className={cn(
            "size-2.5 shrink-0",
            isAvailable && "fill-emerald-500 text-emerald-500",
            isBusy && "fill-amber-500 text-amber-500",
            local === "offline" && "fill-muted-foreground text-muted-foreground"
          )}
        />
      )}
      {label}
    </Button>
  );
}
