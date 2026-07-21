import { appUrl } from "@/lib/app-url";
import { qrPng, tableUrl } from "@/lib/qr";
import { createClient } from "@/lib/supabase/server";

/**
 * PNG download for one table's QR code.
 *
 * Takes a table id, not a token, and reads it through the caller's own session:
 * RLS then guarantees an owner can only download codes for their own tables.
 * Accepting a raw token instead would turn this into an open QR generator for
 * arbitrary strings, on our domain.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: table } = await supabase
    .from("tables")
    .select("table_number, qr_token")
    .eq("id", id)
    .maybeSingle();

  if (!table) {
    return new Response("Not found", { status: 404 });
  }

  const origin = await appUrl();
  const png = await qrPng(tableUrl(table.qr_token, origin));

  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="table-${table.table_number}.png"`,
      // The token can be regenerated, so never let a stale code sit in a cache.
      "Cache-Control": "no-store",
    },
  });
}
