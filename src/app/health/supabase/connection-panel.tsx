"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { checkSupabaseConnection, type ConnectionCheck } from "./actions";

export function ConnectionPanel() {
  const [checks, setChecks] = useState<ConnectionCheck[] | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function run() {
    startTransition(async () => {
      setFailure(null);
      try {
        setChecks(await checkSupabaseConnection());
      } catch (error) {
        setChecks(null);
        setFailure(error instanceof Error ? error.message : String(error));
      }
    });
  }

  return (
    <div className="space-y-4">
      <Button onClick={run} disabled={isPending}>
        {isPending ? (
          <>
            <Loader2 className="animate-spin" />
            جارٍ الفحص…
          </>
        ) : (
          "تشغيل الفحص"
        )}
      </Button>

      {failure && (
        <p className="text-destructive text-sm">
          فشل تشغيل الفحص: {failure}
        </p>
      )}

      {checks && (
        <ul className="space-y-3">
          {checks.map((check) => (
            <li
              key={check.label}
              className="flex items-start gap-3 rounded-lg border p-3"
            >
              {check.ok ? (
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
              ) : (
                <XCircle className="text-destructive mt-0.5 size-5 shrink-0" />
              )}
              <div className="space-y-1">
                <p className="text-sm font-medium">{check.label}</p>
                <p
                  className={cn(
                    "text-sm",
                    check.ok ? "text-muted-foreground" : "text-destructive"
                  )}
                >
                  {check.detail}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
