"use client";

import { useTransition } from "react";
import { Bike, Check, Loader2, TriangleAlert, UserX } from "lucide-react";
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

  // Offline drivers are hidden — dispatch cannot hand a run to someone who has
  // stepped away. The one already carrying this order stays listed even if they
  // just went offline, so it can still be seen and taken back.
  const selectable = drivers.filter(
    (driver) =>
      (driver.driver_status ?? "offline") !== "offline" ||
      driver.id === assigned?.id
  );

  // An assigned driver who has gone offline is still holding the order — the
  // owner needs to see that to decide whether to reassign, so the button turns
  // to a warning rather than staying a calm "assigned".
  const assignedOffline =
    assigned != null && (assigned.driver_status ?? "offline") === "offline";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={assignedOffline ? "outline" : assigned ? "outline" : "secondary"}
          size="sm"
          disabled={isPending}
          className={cn(
            "w-full justify-start",
            assignedOffline &&
              "border-amber-300 text-amber-900 dark:border-amber-900 dark:text-amber-200"
          )}
        >
          {isPending ? (
            <Loader2 className="animate-spin" />
          ) : assignedOffline ? (
            <TriangleAlert className="shrink-0" />
          ) : (
            <Bike className="shrink-0" />
          )}
          {assigned
            ? assigned.full_name ?? t.orders.assignedDriver
            : t.orders.assignDriver}
          {assignedOffline && (
            <span className="text-xs font-normal">· {t.orders.driverOffline}</span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-56">
        {selectable.length === 0 ? (
          <DropdownMenuItem disabled>
            {drivers.length === 0 ? t.orders.noDrivers : t.orders.noDriversOnline}
          </DropdownMenuItem>
        ) : (
          selectable.map((driver) => {
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
