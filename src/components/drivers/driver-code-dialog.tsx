"use client";

import { useState } from "react";
import { Check, Copy, KeyRound } from "lucide-react";

import { useT } from "@/components/i18n/i18n-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatIraqiPhone } from "@/lib/auth/phone";

/**
 * Shows a driver's login code once.
 *
 * The code is a password, and the server never hands it back a second time — so
 * this is the single moment the owner has to pass it on. The screen says so, in
 * as many words, because an owner who dismisses it thinking they can look it up
 * later is an owner who has to regenerate it.
 */
export function DriverCodeDialog({
  issued,
  onClose,
}: {
  issued: { phone: string; code: string } | null;
  onClose: () => void;
}) {
  const t = useT();
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!issued) return;
    try {
      await navigator.clipboard.writeText(issued.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked — the code is on screen to read regardless.
    }
  }

  return (
    <Dialog
      open={issued !== null}
      onOpenChange={(open) => {
        if (!open) {
          setCopied(false);
          onClose();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="size-5" />
            {t.drivers.codeTitle}
          </DialogTitle>
        </DialogHeader>

        {issued && (
          <div className="space-y-4">
            <p className="text-muted-foreground text-sm">
              {t.drivers.codeBody}
            </p>

            <div className="space-y-1 rounded-xl border p-4 text-center">
              <p className="text-muted-foreground text-xs" dir="ltr">
                {formatIraqiPhone(issued.phone)}
              </p>
              <p className="font-mono text-3xl font-bold tracking-widest" dir="ltr">
                {issued.code}
              </p>
            </div>

            <Button variant="outline" className="w-full" onClick={copy}>
              {copied ? <Check /> : <Copy />}
              {copied ? t.drivers.codeCopied : t.drivers.copyCode}
            </Button>

            <p className="text-muted-foreground text-xs">
              {t.drivers.codeOnce}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
