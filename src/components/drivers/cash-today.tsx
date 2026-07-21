import { Banknote } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getT } from "@/lib/i18n/server";
import { interpolate } from "@/lib/i18n";
import { formatMoney } from "@/lib/utils";

export type DriverCash = {
  driver_id: string;
  driver_name: string | null;
  delivered_count: number;
  cash_total: number;
};

/**
 * The day's cash on delivery, per driver.
 *
 * A server component: the numbers come from the 0013 RPC, already scoped to this
 * restaurant and to staff, so there is nothing interactive to hydrate. Drivers
 * who delivered nothing today are shown with a zero rather than dropped — the
 * point of reconciliation is to account for everyone, including who was idle.
 */
export async function CashToday({ rows }: { rows: DriverCash[] }) {
  const t = await getT();

  const total = rows.reduce((sum, row) => sum + Number(row.cash_total), 0);
  const deliveries = rows.reduce(
    (sum, row) => sum + Number(row.delivered_count),
    0
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Banknote className="size-5" />
          {t.drivers.cashToday}
        </CardTitle>
        <CardDescription>{t.drivers.cashTodayHint}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <ul className="divide-y">
          {rows.map((row) => (
            <li
              key={row.driver_id}
              className="flex items-center justify-between gap-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{row.driver_name}</p>
                <p className="text-muted-foreground text-xs">
                  {interpolate(t.drivers.deliveriesCount, {
                    count: Number(row.delivered_count),
                  })}
                </p>
              </div>
              <span className="font-bold tabular-nums">
                {formatMoney(Number(row.cash_total))}
              </span>
            </li>
          ))}
        </ul>

        <div className="flex items-center justify-between border-t pt-3">
          <span className="text-muted-foreground text-sm">
            {interpolate(t.drivers.deliveriesCount, { count: deliveries })}
          </span>
          <span className="text-lg font-bold tabular-nums">
            {formatMoney(total)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
