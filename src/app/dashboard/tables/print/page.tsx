import { notFound } from "next/navigation";
import { TriangleAlert } from "lucide-react";

import { PrintButton } from "@/components/tables/print-button";
import { appUrl, isUnprintableOrigin } from "@/lib/app-url";
import { getT } from "@/lib/i18n/server";
import { interpolate } from "@/lib/i18n";
import { qrSvg, tableUrl } from "@/lib/qr";
import { getRestaurant } from "@/lib/restaurant";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata() {
  const t = await getT();
  return { title: `${t.qr.printSheet} | ${t.brand.name}` };
}

export default async function PrintTablesPage({
  searchParams,
}: {
  searchParams: Promise<{ table?: string }>;
}) {
  const { table: onlyTable } = await searchParams;
  const [t, restaurant, origin] = await Promise.all([
    getT(),
    getRestaurant(),
    appUrl(),
  ]);

  const supabase = await createClient();
  let query = supabase
    .from("tables")
    .select("id, table_number, label, qr_token")
    // A deactivated table's QR does not resolve, so printing one wastes paper.
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (onlyTable) query = query.eq("id", onlyTable);

  const { data } = await query;
  const tables = data ?? [];

  if (tables.length === 0) notFound();

  const cards = await Promise.all(
    tables.map(async (table) => ({
      ...table,
      url: tableUrl(table.qr_token, origin),
      svg: await qrSvg(tableUrl(table.qr_token, origin)),
    }))
  );

  const badOrigin = isUnprintableOrigin(origin);

  return (
    <div className="mx-auto w-full max-w-4xl p-4 print:max-w-none print:p-0">
      {/* Everything in here is screen-only; the sheet itself must be nothing
          but QR cards, or the first printed page is wasted on chrome. */}
      <div className="mb-6 space-y-3 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{t.qr.printSheet}</h1>
            <p className="text-muted-foreground text-sm">
              {interpolate(t.qr.printSheetHint, { count: cards.length })}
            </p>
          </div>
          <PrintButton />
        </div>

        {badOrigin && (
          <div className="border-destructive/40 bg-destructive/5 text-destructive flex items-start gap-2 rounded-lg border p-3 text-sm">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <span>{interpolate(t.qr.localhostWarning, { origin })}</span>
          </div>
        )}
      </div>

      {/* A4, three across. Each card avoids being split across a page break. */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 print:grid-cols-3 print:gap-3">
        {cards.map((card) => (
          <div
            key={card.id}
            className="flex break-inside-avoid flex-col items-center gap-2 rounded-lg border p-3 text-center print:border-black/20"
          >
            <div className="w-full [&>svg]:h-auto [&>svg]:w-full">
              <span dangerouslySetInnerHTML={{ __html: card.svg }} />
            </div>

            <div className="w-full">
              <p className="text-lg font-bold leading-tight">
                {interpolate(t.qr.tableTitle, { number: card.table_number })}
              </p>
              {card.label && (
                <p className="text-muted-foreground truncate text-xs">
                  {card.label}
                </p>
              )}
              <p className="mt-1 truncate text-xs font-medium">
                {restaurant?.name}
              </p>
            </div>

            <p className="text-muted-foreground text-[10px]">{t.qr.scanToOrder}</p>
          </div>
        ))}
      </div>

      <style>{`
        @page { size: A4; margin: 10mm; }
        @media print {
          html, body { background: #fff; }
        }
      `}</style>
    </div>
  );
}
