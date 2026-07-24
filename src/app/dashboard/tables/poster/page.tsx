import { notFound } from "next/navigation";
import { TriangleAlert } from "lucide-react";

import { PrintButton } from "@/components/tables/print-button";
import { Button } from "@/components/ui/button";
import { appUrl, isUnprintableOrigin } from "@/lib/app-url";
import { getT } from "@/lib/i18n/server";
import { interpolate } from "@/lib/i18n";
import { qrSvg, restaurantUrl } from "@/lib/qr";
import { getRestaurant } from "@/lib/restaurant";

export async function generateMetadata() {
  const t = await getT();
  return { title: `${t.qr.posterTitle} | ${t.brand.name}` };
}

const STICKER_COUNT = 9;

export default async function StorefrontPosterPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const [{ mode }, t, restaurant, origin] = await Promise.all([
    searchParams,
    getT(),
    getRestaurant(),
    appUrl(),
  ]);

  if (!restaurant?.slug) notFound();

  const url = restaurantUrl(restaurant.slug, origin);
  const svg = await qrSvg(url);
  const shortLink = url.replace(/^https?:\/\//, "");
  const stickers = mode === "stickers";
  const badOrigin = isUnprintableOrigin(origin);

  return (
    <div className="mx-auto w-full max-w-3xl p-4 print:max-w-none print:p-0">
      {/* Screen-only chrome; the sheet itself is only the poster/stickers. */}
      <div className="mb-6 space-y-3 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{t.qr.posterTitle}</h1>
            <p className="text-muted-foreground text-sm">
              {stickers ? t.qr.stickers : t.qr.poster}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <a href={stickers ? "/dashboard/tables/poster" : "/dashboard/tables/poster?mode=stickers"}>
                {stickers ? t.qr.poster : t.qr.stickers}
              </a>
            </Button>
            <PrintButton />
          </div>
        </div>

        {badOrigin && (
          <div className="border-destructive/40 bg-destructive/5 text-destructive flex items-start gap-2 rounded-lg border p-3 text-sm">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <span>{interpolate(t.qr.localhostWarning, { origin })}</span>
          </div>
        )}
      </div>

      {stickers ? (
        <div className="grid grid-cols-3 gap-3 print:gap-2">
          {Array.from({ length: STICKER_COUNT }).map((_, index) => (
            <div
              key={index}
              className="flex break-inside-avoid flex-col items-center gap-1 rounded-lg border p-3 text-center print:border-black/20"
            >
              <div className="w-full rounded bg-white p-1 [&>svg]:h-auto [&>svg]:w-full">
                <span dangerouslySetInnerHTML={{ __html: svg }} />
              </div>
              <p className="text-sm font-bold leading-tight">{t.qr.orderOnline}</p>
              <p className="w-full truncate text-xs font-medium">{restaurant.name}</p>
              <p className="font-mono text-[9px]" dir="ltr">
                {shortLink}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="mx-auto flex max-w-xl flex-col items-center gap-6 rounded-2xl border p-10 text-center print:min-h-[90vh] print:justify-center print:border-0">
          <h1 className="text-4xl font-black leading-tight">{restaurant.name}</h1>
          <div className="rounded-2xl bg-white p-5 [&>svg]:h-auto [&>svg]:w-72">
            <span dangerouslySetInnerHTML={{ __html: svg }} />
          </div>
          <p className="text-3xl font-bold">{t.qr.orderOnline}</p>
          <p className="font-mono text-lg" dir="ltr">
            {shortLink}
          </p>
        </div>
      )}

      <style>{`
        @page { size: A4; margin: 10mm; }
        @media print {
          html, body { background: #fff; color: #000; }
        }
      `}</style>
    </div>
  );
}
