"use client";

import { Download, Printer, QrCode, Sticker } from "lucide-react";

import { useT } from "@/components/i18n/i18n-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/**
 * The restaurant-level storefront QR for the delivery link (§9). Same white,
 * padded backing as the table QR so the dark modules always sit on white with a
 * quiet zone, scannable regardless of the dark dashboard. The SVG is generated
 * on the server and passed in, so the browser never loads a QR library.
 */
export function RestaurantQr({ url, svg }: { url: string; svg: string }) {
  const t = useT();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <QrCode />
          {t.qr.restaurantQr}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t.qr.restaurantQr}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div
            className="mx-auto w-56 rounded-lg bg-white p-3 [&>svg]:h-auto [&>svg]:w-full"
            dangerouslySetInnerHTML={{ __html: svg }}
          />

          <p
            className="text-muted-foreground break-all text-center font-mono text-xs"
            dir="ltr"
          >
            {url}
          </p>

          <div className="grid gap-2">
            <Button asChild variant="outline" size="sm">
              <a href="/api/restaurant/qr" download>
                <Download />
                {t.qr.downloadPng}
              </a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href="/dashboard/tables/poster" target="_blank">
                <Printer />
                {t.qr.poster}
              </a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href="/dashboard/tables/poster?mode=stickers" target="_blank">
                <Sticker />
                {t.qr.stickers}
              </a>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
