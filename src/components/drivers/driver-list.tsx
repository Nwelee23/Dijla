"use client";

import { useState, useTransition } from "react";
import { KeyRound, Loader2, Plus, UserPlus } from "lucide-react";
import { toast } from "sonner";

import {
  regenerateDriverCode,
  setDriverActive,
} from "@/app/dashboard/drivers/actions";
import { DriverCodeDialog } from "@/components/drivers/driver-code-dialog";
import { RegisterDriverDialog } from "@/components/drivers/register-driver-dialog";
import { useT } from "@/components/i18n/i18n-provider";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { formatIraqiPhone } from "@/lib/auth/phone";
import { cn } from "@/lib/utils";

type Driver = {
  id: string;
  full_name: string | null;
  phone: string | null;
  driver_status: string | null;
  is_active: boolean | null;
};

/** Colour per availability, so dispatch reads the roster at a glance. */
const STATUS_STYLES: Record<string, string> = {
  available: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  busy: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  offline: "bg-muted text-muted-foreground",
};

export function DriverList({ drivers }: { drivers: Driver[] }) {
  const t = useT();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // The freshly generated code to show once, in a dialog. Never persisted or
  // shown again — a lost code is regenerated, not looked up.
  const [issued, setIssued] = useState<{ phone: string; code: string } | null>(null);

  function toggleActive(driver: Driver, next: boolean) {
    setPendingId(driver.id);
    startTransition(async () => {
      const result = await setDriverActive(driver.id, next);
      setPendingId(null);
      if (!result.ok) toast.error(result.error);
      else toast.success(next ? t.drivers.activated : t.drivers.deactivated);
    });
  }

  function regenerate(driver: Driver) {
    setPendingId(driver.id);
    startTransition(async () => {
      const result = await regenerateDriverCode(driver.id);
      setPendingId(null);
      if (!result.ok) toast.error(result.error);
      else setIssued({ phone: result.phone, code: result.code });
    });
  }

  return (
    <div className="space-y-4">
      <RegisterDriverDialog
        onRegistered={(phone, code) => setIssued({ phone, code })}
        trigger={
          <Button className="w-full sm:w-auto">
            <UserPlus />
            {t.drivers.addDriver}
          </Button>
        }
      />

      {drivers.length === 0 ? (
        <div className="text-muted-foreground flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <Plus className="size-8 opacity-40" />
          <div className="space-y-1">
            <p className="text-foreground font-medium">{t.drivers.empty}</p>
            <p className="text-sm">{t.drivers.emptyHint}</p>
          </div>
        </div>
      ) : (
        <ul className="divide-y rounded-xl border">
          {drivers.map((driver) => {
            const busy = isPending && pendingId === driver.id;
            const status = driver.driver_status ?? "offline";

            return (
              <li
                key={driver.id}
                className={cn(
                  "flex flex-wrap items-center gap-3 p-4",
                  !driver.is_active && "opacity-60"
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{driver.full_name}</p>
                  {driver.phone && (
                    <p className="text-muted-foreground text-sm" dir="ltr">
                      {formatIraqiPhone(driver.phone)}
                    </p>
                  )}
                </div>

                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs font-semibold",
                    STATUS_STYLES[status] ?? STATUS_STYLES.offline
                  )}
                >
                  {t.drivers.status[status as keyof typeof t.drivers.status] ?? status}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => regenerate(driver)}
                >
                  {busy ? <Loader2 className="animate-spin" /> : <KeyRound />}
                  {t.drivers.newCode}
                </Button>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={driver.is_active !== false}
                    disabled={busy}
                    onCheckedChange={(next) => toggleActive(driver, next)}
                    aria-label={t.drivers.activeSwitch}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <DriverCodeDialog issued={issued} onClose={() => setIssued(null)} />
    </div>
  );
}
