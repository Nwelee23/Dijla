"use client";

import { Download } from "lucide-react";

import { useT } from "@/components/i18n/i18n-provider";
import { Button } from "@/components/ui/button";

/**
 * Export the per-item totals as CSV for the accountant (§B.4). Built and
 * downloaded in the browser from data already on the page — no server round
 * trip, no order rows crossing over. A UTF-8 BOM makes Excel read Arabic right.
 */
export function ExportCsvButton({
  rows,
  filename,
}: {
  rows: { name: string; quantity: number; revenue: number }[];
  filename: string;
}) {
  const t = useT();

  function download() {
    const escape = (value: string | number) => {
      const s = String(value);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const table = [
      [t.reports.csvItem, t.reports.csvQty, t.reports.csvRevenue],
      ...rows.map((r) => [r.name, r.quantity, r.revenue]),
    ];
    const csv = table.map((cols) => cols.map(escape).join(",")).join("\r\n");

    const BOM = "﻿";
    const blob = new Blob([BOM + csv], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (rows.length === 0) return null;

  return (
    <Button variant="outline" size="sm" onClick={download}>
      <Download />
      {t.reports.exportCsv}
    </Button>
  );
}
