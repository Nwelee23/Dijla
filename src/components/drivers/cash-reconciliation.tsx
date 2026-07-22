import { Banknote } from "lucide-react";

import { CashDatePicker } from "@/components/drivers/cash-date-picker";
import { PrintButton } from "@/components/tables/print-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getT } from "@/lib/i18n/server";
import { interpolate } from "@/lib/i18n";
import { cn, formatMoney } from "@/lib/utils";

export type ReconciliationRow = {
  driver_id: string;
  driver_name: string | null;
  delivered_count: number;
  expected: number;
  collected: number;
};

/**
 * End-of-day cash reconciliation, per driver: what each was owed against what
 * they recorded collecting, and the shortfall to explain. The whole card is
 * built to print — the date picker and print button are screen-only, and a
 * heading that names the restaurant and the day appears only on paper, so the
 * printed sheet stands on its own as a handover record.
 */
export async function CashReconciliation({
  rows,
  date,
  restaurantName,
  currency,
}: {
  rows: ReconciliationRow[];
  date: string;
  restaurantName: string;
  currency: string;
}) {
  const t = await getT();
  const money = (value: number) => formatMoney(Number(value), currency);

  const totals = rows.reduce(
    (acc, row) => ({
      delivered: acc.delivered + Number(row.delivered_count),
      expected: acc.expected + Number(row.expected),
      collected: acc.collected + Number(row.collected),
    }),
    { delivered: 0, expected: 0, collected: 0 }
  );
  const totalShort = totals.expected - totals.collected;

  return (
    <Card>
      <CardHeader className="print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Banknote className="size-5" />
              {t.cash.title}
            </CardTitle>
            <CardDescription>{t.cash.subtitle}</CardDescription>
          </div>
          <PrintButton />
        </div>
        <div className="pt-2">
          <CashDatePicker date={date} />
        </div>
      </CardHeader>

      <CardContent>
        {/* Print-only heading: names the sheet so paper stands alone. */}
        <div className="mb-4 hidden print:block">
          <p className="text-lg font-bold">{restaurantName}</p>
          <p className="text-sm">
            {t.cash.title} · {date}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground border-b text-start">
                <th className="py-2 text-start font-medium">{t.cash.driver}</th>
                <th className="py-2 text-end font-medium">{t.cash.delivered}</th>
                <th className="py-2 text-end font-medium">{t.cash.expected}</th>
                <th className="py-2 text-end font-medium">{t.cash.collected}</th>
                <th className="py-2 text-end font-medium">{t.cash.shortfall}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const short = Number(row.expected) - Number(row.collected);
                return (
                  <tr key={row.driver_id} className="border-b">
                    <td className="py-2">{row.driver_name}</td>
                    <td className="py-2 text-end tabular-nums">
                      {Number(row.delivered_count)}
                    </td>
                    <td className="py-2 text-end tabular-nums">
                      {money(row.expected)}
                    </td>
                    <td className="py-2 text-end tabular-nums">
                      {money(row.collected)}
                    </td>
                    <td
                      className={cn(
                        "py-2 text-end font-medium tabular-nums",
                        short > 0 && "text-destructive"
                      )}
                    >
                      {short > 0 ? money(short) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="font-bold">
                <td className="py-2">{t.cash.total}</td>
                <td className="py-2 text-end tabular-nums">{totals.delivered}</td>
                <td className="py-2 text-end tabular-nums">{money(totals.expected)}</td>
                <td className="py-2 text-end tabular-nums">{money(totals.collected)}</td>
                <td
                  className={cn(
                    "py-2 text-end tabular-nums",
                    totalShort > 0 && "text-destructive"
                  )}
                >
                  {totalShort > 0 ? money(totalShort) : "—"}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {rows.length === 0 && (
          <p className="text-muted-foreground py-6 text-center">
            {t.cash.noDrivers}
          </p>
        )}

        <p className="text-muted-foreground mt-3 text-xs">
          {interpolate(t.cash.deliveredNote, { count: totals.delivered })}
        </p>
      </CardContent>
    </Card>
  );
}
