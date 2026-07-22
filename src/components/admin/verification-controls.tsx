"use client";

import { useState, useTransition } from "react";
import { BadgeCheck, Clock, Loader2, ShieldX, X } from "lucide-react";
import { toast } from "sonner";

import { setVerification } from "@/app/admin/actions";
import { useT } from "@/components/i18n/i18n-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const CHIP: Record<string, string> = {
  pending: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  verified: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  rejected: "bg-destructive/10 text-destructive",
};

/**
 * Admin verify/reject for one restaurant (AUTH_UI_SPEC §6). A chip shows the
 * state; when it is not verified, Verify approves immediately and Reject reveals
 * an inline reason the owner will then see. Writes go through setVerification,
 * the service-role path the guard trigger trusts.
 */
export function VerificationControls({
  restaurantId,
  status,
  note,
}: {
  restaurantId: string;
  status: string;
  note: string | null;
}) {
  const t = useT();
  const [isPending, startTransition] = useTransition();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState(note ?? "");

  const label = t.admin.verificationStatuses[status as keyof typeof t.admin.verificationStatuses] ?? status;

  function act(next: "verified" | "rejected", noteArg: string | null) {
    startTransition(async () => {
      const result = await setVerification(restaurantId, next, noteArg);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setRejecting(false);
      toast.success(next === "verified" ? t.admin.verifyDone : t.admin.rejectDone);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <span className={cn("flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold", CHIP[status] ?? CHIP.pending)}>
        {status === "verified" ? <BadgeCheck className="size-3" /> : status === "rejected" ? <ShieldX className="size-3" /> : <Clock className="size-3" />}
        {label}
      </span>

      {status === "rejected" && note && !rejecting && (
        <span className="text-muted-foreground max-w-48 truncate text-xs">{note}</span>
      )}

      {rejecting ? (
        <div className="flex items-center gap-1.5">
          <Input
            className="h-8 w-40 text-xs"
            placeholder={t.admin.rejectReason}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            autoFocus
          />
          <Button size="sm" variant="destructive" disabled={isPending} onClick={() => act("rejected", reason)}>
            {isPending ? <Loader2 className="animate-spin" /> : null}
            {t.admin.confirmReject}
          </Button>
          <Button size="icon" variant="ghost" className="size-8" onClick={() => setRejecting(false)} aria-label={t.common.cancel}>
            <X className="size-4" />
          </Button>
        </div>
      ) : (
        status !== "verified" && (
          <div className="flex items-center gap-1.5">
            <Button size="sm" disabled={isPending} onClick={() => act("verified", null)}>
              {isPending ? <Loader2 className="animate-spin" /> : <BadgeCheck />}
              {t.admin.verify}
            </Button>
            <Button size="sm" variant="outline" disabled={isPending} onClick={() => setRejecting(true)}>
              {t.admin.reject}
            </Button>
          </div>
        )
      )}
    </div>
  );
}
