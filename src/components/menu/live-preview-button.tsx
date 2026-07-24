"use client";

import { useState } from "react";
import { ExternalLink, Eye, RefreshCw, X } from "lucide-react";

import { useT } from "@/components/i18n/i18n-provider";
import { Button } from "@/components/ui/button";

/**
 * Live customer preview (REDESIGN_V2_SPEC §7.6). On a wide screen it opens as a
 * side panel next to the builder so edits can be checked without leaving the
 * page; on a phone it fills the screen. An "open in a new tab" escape hatch and
 * a refresh (to pick up a just-saved change) sit in the panel header.
 *
 * The preview is the real customer route in an iframe — its own light-themed
 * document — so what the owner sees is exactly what a diner gets.
 */
export function LivePreviewButton({ slug }: { slug: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const href = `/r/${slug}`;

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Eye />
        {t.menu.preview}
      </Button>

      {open && (
        <div className="bg-card fixed inset-0 z-50 flex flex-col border-s shadow-2xl lg:inset-y-0 lg:end-0 lg:start-auto lg:w-[420px]">
          <div className="flex items-center gap-1 border-b p-2">
            <span className="ms-2 flex-1 truncate text-sm font-semibold">
              {t.menu.preview}
            </span>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t.menu.previewRefresh}
              title={t.menu.previewRefresh}
              onClick={() => setReloadKey((key) => key + 1)}
            >
              <RefreshCw className="size-4" />
            </Button>
            <Button asChild variant="ghost" size="icon" aria-label={t.menu.previewNewTab}>
              <a href={href} target="_blank" rel="noreferrer" title={t.menu.previewNewTab}>
                <ExternalLink className="size-4" />
              </a>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t.common.close}
              onClick={() => setOpen(false)}
            >
              <X className="size-4" />
            </Button>
          </div>

          <iframe
            key={reloadKey}
            src={href}
            title={t.menu.preview}
            className="size-full flex-1 border-0 bg-white"
          />
        </div>
      )}
    </>
  );
}
