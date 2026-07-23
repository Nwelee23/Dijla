"use client";

import { useState, useTransition } from "react";
import {
  BadgeCheck,
  Clock,
  ExternalLink,
  FileText,
  Loader2,
  MapPin,
  Phone,
  ShieldX,
} from "lucide-react";
import { toast } from "sonner";

import {
  getVerificationDetails,
  setVerification,
  type VerificationDetails,
} from "@/app/admin/actions";
import { useT } from "@/components/i18n/i18n-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { areaLabel } from "@/lib/areas";
import { interpolate } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const CHIP: Record<string, string> = {
  pending: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  verified: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  rejected: "bg-destructive/10 text-destructive",
};

/**
 * The verification queue's review surface (§C.4). The admin opens a pending
 * restaurant, sees owner details, the landmark, a genuine-intent signal (signup
 * age + menu items built) and the ID/licence documents via short-lived SIGNED
 * URLs, then verifies or rejects with a required reason — never approving blind.
 */
export function VerificationReview({
  restaurantId,
  restaurantName,
  status,
  note,
}: {
  restaurantId: string;
  restaurantName: string;
  status: string;
  note: string | null;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState<VerificationDetails | null>(null);
  const [signupDays, setSignupDays] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState(note ?? "");
  const [isPending, startTransition] = useTransition();

  async function load() {
    setLoading(true);
    const result = await getVerificationDetails(restaurantId);
    setLoading(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setDetails(result.details);
    // Computed at fetch time (an event handler), not in render, so Date.now stays
    // out of the pure render path.
    setSignupDays(
      result.details.createdAt != null
        ? Math.floor((Date.now() - Date.parse(result.details.createdAt)) / 86_400_000)
        : null
    );
  }

  function act(next: "verified" | "rejected", noteArg: string | null) {
    startTransition(async () => {
      const result = await setVerification(restaurantId, next, noteArg);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(next === "verified" ? t.admin.verifyDone : t.admin.rejectDone);
      setOpen(false);
    });
  }

  const label =
    t.admin.verificationStatuses[status as keyof typeof t.admin.verificationStatuses] ?? status;

  return (
    <div className="flex flex-col items-end gap-1.5">
      <span
        className={cn(
          "flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
          CHIP[status] ?? CHIP.pending
        )}
      >
        {status === "verified" ? <BadgeCheck className="size-3" /> : status === "rejected" ? <ShieldX className="size-3" /> : <Clock className="size-3" />}
        {label}
      </span>

      {status === "rejected" && note && (
        <span className="text-muted-foreground max-w-48 truncate text-xs">{note}</span>
      )}

      {status !== "verified" && (
        <Dialog
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            if (next && !details) void load();
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <FileText />
              {t.admin.review}
            </Button>
          </DialogTrigger>

          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {t.admin.reviewTitle} · {restaurantName}
              </DialogTitle>
            </DialogHeader>

            {loading || !details ? (
              <p className="text-muted-foreground flex items-center gap-2 py-8 text-sm">
                <Loader2 className="size-4 animate-spin" />
                {t.common.loading}
              </p>
            ) : (
              <div className="space-y-4">
                {/* genuine-intent signal */}
                <div className="bg-muted/40 flex flex-wrap gap-x-4 gap-y-1 rounded-lg p-3 text-sm">
                  {signupDays !== null && (
                    <span>{interpolate(t.admin.signedUpAgo, { count: signupDays })}</span>
                  )}
                  <span className="font-medium">
                    {interpolate(t.admin.menuItemsBuilt, { count: details.menuItemCount })}
                  </span>
                </div>

                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <Field label={t.admin.ownerNameLabel} value={details.ownerName} />
                  <div>
                    <dt className="text-muted-foreground text-xs">{t.common.phone}</dt>
                    <dd className="flex items-center gap-1 font-medium" dir="ltr">
                      {details.phone ? (
                        <>
                          <Phone className="size-3.5" />
                          {details.phone}
                          {details.phoneVerified && <BadgeCheck className="size-3.5 text-emerald-500" />}
                        </>
                      ) : "—"}
                    </dd>
                  </div>
                  <Field
                    label={t.admin.typeLabel}
                    value={details.restaurantType ? t.restaurantTypes[details.restaurantType as keyof typeof t.restaurantTypes] : null}
                  />
                  <Field label={t.common.area} value={areaLabel(t, details.area)} />
                  <Field label={t.admin.districtLabel} value={details.district} />
                  <div className="col-span-2">
                    <dt className="text-muted-foreground text-xs">{t.admin.landmarkLabel}</dt>
                    <dd className="flex items-start gap-1 font-medium">
                      {details.landmark ? <><MapPin className="mt-0.5 size-3.5 shrink-0" />{details.landmark}</> : "—"}
                    </dd>
                  </div>
                </dl>

                <div className="grid grid-cols-2 gap-2">
                  <DocCard label={t.admin.idDocument} url={details.idDocUrl} openLabel={t.admin.openDoc} missing={t.admin.noDoc} />
                  <DocCard label={t.admin.licenseDocument} url={details.licenseDocUrl} openLabel={t.admin.openDoc} missing={t.admin.noDoc} />
                </div>

                {rejecting ? (
                  <div className="space-y-2">
                    <Input
                      placeholder={t.admin.rejectReason}
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      autoFocus
                    />
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setRejecting(false)}>
                        {t.common.cancel}
                      </Button>
                      <Button variant="destructive" size="sm" disabled={isPending || !reason.trim()} onClick={() => act("rejected", reason)}>
                        {isPending ? <Loader2 className="animate-spin" /> : null}
                        {t.admin.confirmReject}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" disabled={isPending} onClick={() => setRejecting(true)}>
                      {t.admin.reject}
                    </Button>
                    <Button size="sm" disabled={isPending} onClick={() => act("verified", null)}>
                      {isPending ? <Loader2 className="animate-spin" /> : <BadgeCheck />}
                      {t.admin.verify}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="font-medium">{value || "—"}</dd>
    </div>
  );
}

function DocCard({
  label,
  url,
  openLabel,
  missing,
}: {
  label: string;
  url: string | null;
  openLabel: string;
  missing: string;
}) {
  return (
    <div className="rounded-lg border p-3 text-sm">
      <p className="text-muted-foreground mb-1 flex items-center gap-1 text-xs">
        <FileText className="size-3.5" />
        {label}
      </p>
      {url ? (
        <a href={url} target="_blank" rel="noreferrer" className="text-primary inline-flex items-center gap-1 font-medium">
          <ExternalLink className="size-3.5" />
          {openLabel}
        </a>
      ) : (
        <span className="text-muted-foreground">{missing}</span>
      )}
    </div>
  );
}
