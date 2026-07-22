"use client";

import { useTransition } from "react";
import { CircleAlert, Clock, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { resubmitVerification } from "@/app/dashboard/verification-actions";
import { useT } from "@/components/i18n/i18n-provider";
import { Button } from "@/components/ui/button";

/**
 * The verification state a restaurant sits in until an admin approves it
 * (AUTH_UI_SPEC §6). Pending is reassuring — the menu can be built now, only
 * live orders wait. Rejected shows the reason and offers a resubmit. Verified
 * shows nothing: the dashboard is simply itself.
 */
export function VerificationBanner({
  status,
  note,
}: {
  status: string | null;
  note: string | null;
}) {
  const t = useT();
  const [isPending, startTransition] = useTransition();

  if (status === "verified" || status == null) return null;

  if (status === "rejected") {
    return (
      <div className="border-b border-red-200 bg-red-50 dark:border-red-950 dark:bg-red-950/40">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5 text-sm text-red-900 dark:text-red-200">
          <CircleAlert className="size-4 shrink-0" />
          <span className="font-medium">{t.verification.rejectedTitle}</span>
          {note && <span className="text-red-800/90 dark:text-red-200/80">{note}</span>}
          <Button
            variant="outline"
            size="sm"
            className="ms-auto"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                const result = await resubmitVerification();
                if (!result.ok) toast.error(result.error ?? t.admin.updateFailed);
                else toast.success(t.verification.resubmitted);
              })
            }
          >
            {isPending ? <Loader2 className="animate-spin" /> : <RefreshCw />}
            {t.verification.resubmit}
          </Button>
        </div>
      </div>
    );
  }

  // pending
  return (
    <div className="border-b border-amber-200 bg-amber-50 dark:border-amber-950 dark:bg-amber-950/40">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-4 py-2.5 text-sm text-amber-900 dark:text-amber-200">
        <Clock className="size-4 shrink-0" />
        <span className="font-medium">{t.verification.pendingTitle}</span>
        <span className="text-amber-800/90 dark:text-amber-200/80">
          {t.verification.pendingHint}
        </span>
      </div>
    </div>
  );
}
