"use client";

import { useT } from "@/components/i18n/i18n-provider";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export type CohortCell = {
  cohort_month: string;
  months_since: number;
  active_count: number;
  cohort_size: number;
};

/**
 * Signup-month cohort retention (UX_IMPROVEMENTS_SPEC §A.4): each cell is the
 * share of a cohort still active that many months after signup, colour-scaled
 * so the retention shape is readable at a glance. This one table says whether
 * the business model holds.
 */
export function CohortRetention({ rows }: { rows: CohortCell[] }) {
  const t = useT();
  if (rows.length === 0) return null;

  const cohorts = [...new Set(rows.map((r) => r.cohort_month))].sort();
  const maxMonths = Math.max(0, ...rows.map((r) => r.months_since));
  const months = Array.from({ length: maxMonths + 1 }, (_, i) => i);

  const sizeByCohort = new Map<string, number>();
  const pctByCell = new Map<string, number>();
  for (const r of rows) {
    sizeByCohort.set(r.cohort_month, r.cohort_size);
    if (r.cohort_size > 0) {
      pctByCell.set(
        `${r.cohort_month}:${r.months_since}`,
        Math.round((r.active_count / r.cohort_size) * 100)
      );
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t.growth.cohortTitle}</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-muted-foreground">
              <th className="p-1 text-start font-medium">{t.growth.cohort}</th>
              {months.map((m) => (
                <th key={m} className="p-1 font-medium tabular-nums">
                  {m}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cohorts.map((cohort) => (
              <tr key={cohort}>
                <th className="whitespace-nowrap p-1 text-start font-medium">
                  {cohort.slice(0, 7)}{" "}
                  <span className="text-muted-foreground">
                    ({sizeByCohort.get(cohort) ?? 0})
                  </span>
                </th>
                {months.map((m) => {
                  const pct = pctByCell.get(`${cohort}:${m}`);
                  return (
                    <td
                      key={m}
                      className="p-1 text-center tabular-nums"
                      style={
                        pct != null
                          ? {
                              backgroundColor: `color-mix(in srgb, var(--brand) ${pct}%, transparent)`,
                            }
                          : undefined
                      }
                    >
                      {pct != null ? `${pct}%` : ""}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
