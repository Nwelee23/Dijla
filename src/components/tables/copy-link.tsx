"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";

import { useT } from "@/components/i18n/i18n-provider";
import { Button } from "@/components/ui/button";

/**
 * The restaurant's public delivery link with a copy action (MENU_BUILDER_SPEC
 * §7) — what the owner pastes into WhatsApp/Instagram to take delivery orders.
 */
export function CopyLink({ url }: { url: string }) {
  const t = useT();
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(t.tables.copied);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t.tables.copyFailed);
    }
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border p-2">
      <span className="min-w-0 flex-1 truncate font-mono text-xs" dir="ltr">
        {url}
      </span>
      <Button type="button" variant="outline" size="sm" onClick={copy} className="shrink-0">
        {copied ? <Check /> : <Copy />}
        {copied ? t.tables.copied : t.tables.copy}
      </Button>
    </div>
  );
}
