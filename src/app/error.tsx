"use client";

import { TriangleAlert } from "lucide-react";

import { useT } from "@/components/i18n/i18n-provider";
import { Button } from "@/components/ui/button";

/**
 * Segment error boundary. Rendered inside the root layout, so the i18n provider
 * is present and it speaks the user's language, with a retry that re-runs the
 * failed render rather than forcing a full reload.
 */
export default function Error({ reset }: { error: Error; reset: () => void }) {
  const t = useT();

  return (
    <main className="flex min-h-dvh flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <TriangleAlert className="text-destructive size-12" />
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">{t.errors.errorTitle}</h1>
        <p className="text-muted-foreground max-w-xs text-balance">
          {t.errors.errorBody}
        </p>
      </div>
      <Button onClick={reset}>{t.errors.retry}</Button>
    </main>
  );
}
