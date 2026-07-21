import { Printer, Plus, QrCode } from "lucide-react";
import Link from "next/link";

import { QrPreview } from "@/components/tables/qr-preview";
import { TableDialog } from "@/components/tables/table-dialog";
import { TableList } from "@/components/tables/table-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { appUrl } from "@/lib/app-url";
import { getT } from "@/lib/i18n/server";
import { qrSvg, tableUrl } from "@/lib/qr";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata() {
  const t = await getT();
  return { title: `${t.tables.title} | ${t.brand.name}` };
}

export default async function TablesPage() {
  const [t, origin] = await Promise.all([getT(), appUrl()]);
  const supabase = await createClient();

  // RLS scopes this to the signed-in restaurant; no filter needed.
  const { data } = await supabase
    .from("tables")
    .select("id, table_number, label, qr_token, is_active")
    .order("created_at", { ascending: true });

  const tables = data ?? [];

  // Rendered here, not in the client component, so the QR library never ships
  // to the browser.
  const qrSlots = Object.fromEntries(
    await Promise.all(
      tables.map(async (table) => {
        const url = tableUrl(table.qr_token, origin);
        return [
          table.id,
          <QrPreview
            key={table.id}
            tableId={table.id}
            tableNumber={table.table_number}
            url={url}
            svg={await qrSvg(url)}
          />,
        ] as const;
      })
    )
  );

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t.tables.title}</h1>
          <p className="text-muted-foreground text-sm">{t.tables.subtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          {tables.length > 0 && (
            <Button asChild variant="outline">
              <Link href="/dashboard/tables/print" target="_blank">
                <Printer />
                {t.qr.printAll}
              </Link>
            </Button>
          )}
          <TableDialog
            trigger={
              <Button>
                <Plus />
                {t.tables.addTable}
              </Button>
            }
          />
        </div>
      </div>

      {tables.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground flex flex-col items-center gap-3 py-12 text-center">
            <QrCode className="size-10 opacity-40" />
            <div className="space-y-1">
              <p className="text-foreground font-medium">{t.tables.noTables}</p>
              <p className="text-sm">{t.tables.noTablesHint}</p>
            </div>
            <TableDialog
              trigger={
                <Button variant="outline">
                  <Plus />
                  {t.tables.addFirstTable}
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <TableList tables={tables} qrSlots={qrSlots} />
      )}
    </div>
  );
}
