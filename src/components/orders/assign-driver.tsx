"use client";

import { useTransition } from "react";
import { Bike, Check, Loader2, UserX } from "lucide-react";
import { toast } from "sonner";

import { assignDriver } from "@/app/dashboard/orders/actions";
import { useT } from "@/components/i18n/i18n-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { OrderDriver } from "@/lib/hooks/use-realtime-orders";
import { cn } from "@/lib/utils";

/**
 * Assign, reassign or unassign the driver on a delivery order.
 *
 * The list is the restaurant's active drivers; an offline driver is shown but
 * dimmed rather than hidden, so an owner can still hand a run to someone who has
 * not opened the app yet. The write is a server action that re-checks the driver
 * belongs here — this control only has to be honest about what it offers.
 */
export function AssignDriver({
  orderId,
  assigned,
  drivers,
}: {
  orderId: string;
  assigned: OrderDriver | null;
  drivers: OrderDriver[];
}) {
  const t = useT();
  const [isPending, startTransition] = useTransition();

  function assign(driverId: string | null) {
    startTransition(async () => {
      const result = await assignDriver(orderId, driverId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(driverId ? t.orders.assigned : t.orders.unassigned);
    });
  }

  const statusLabel = (status: string | null) =>
    t.drivers.status[(status ?? "offline") as keyof typeof t.drivers.status] ??
    status;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={assigned ? "outline" : "secondary"}
          size="sm"
          disabled={isPending}
          className="w-full justify-start"
        >
          {isPending ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Bike className="shrink-0" />
          )}
          {assigned
            ? assigned.full_name ?? t.orders.assignedDriver
            : t.orders.assignDriver}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-56">
        {drivers.length === 0 ? (
          <DropdownMenuItem disabled>{t.orders.noDrivers}</DropdownMenuItem>
        ) : (
          drivers.map((driver) => {
            const isAssigned = driver.id === assigned?.id;
            const offline = (driver.driver_status ?? "offline") === "offline";
            return (
              <DropdownMenuItem
                key={driver.id}
                disabled={isPending}
                onSelect={() => assign(isAssigned ? null : driver.id)}
                className="flex items-center gap-2"
              >
                <Check
                  className={cn("size-4 shrink-0", !isAssigned && "opacity-0")}
                />
                <span className="flex-1 truncate">{driver.full_name}</span>
                <span
                  className={cn(
                    "text-xs",
                    offline ? "text-muted-foreground" : "text-emerald-600"
                  )}
                >
                  {statusLabel(driver.driver_status)}
                </span>
              </DropdownMenuItem>
            );
          })
        )}

        {assigned && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={isPending}
              onSelect={() => assign(null)}
              className="text-destructive"
            >
              <UserX className="size-4" />
              {t.orders.unassign}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
