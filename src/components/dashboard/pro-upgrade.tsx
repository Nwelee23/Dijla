"use client";

import { Phone, Sparkles } from "lucide-react";

import { useT } from "@/components/i18n/i18n-provider";
import { Button } from "@/components/ui/button";
import { formatIraqiPhone } from "@/lib/auth/phone";

/**
 * The single upgrade prompt, shown wherever a pro feature is gated — delivery
 * settings and driver management both. One component so the pitch reads the same
 * in every place the owner meets the wall, which is what "consistent upgrade
 * prompts" means.
 *
 * A client component so it drops into both the client delivery form and the
 * server drivers page. The support number is a public env var, so it is safe to
 * read in the browser.
 */
export function ProUpgradePrompt({
  lock,
}: {
  lock: "trial_ended" | "needs_pro";
}) {
  const t = useT();
  const support = process.env.NEXT_PUBLIC_SUPPORT_PHONE;

  return (
    <div className="border-primary/40 bg-primary/5 space-y-2 rounded-xl border p-4">
      <p className="flex items-center gap-2 font-bold">
        <Sparkles className="size-4 shrink-0" />
        {t.pro.title}
      </p>
      <p className="text-muted-foreground text-sm">
        {lock === "trial_ended" ? t.pro.trialEnded : t.pro.body}
      </p>
      {support && (
        <Button asChild variant="outline" size="sm">
          <a href={`tel:${support}`} dir="ltr">
            <Phone />
            {formatIraqiPhone(support)}
          </a>
        </Button>
      )}
    </div>
  );
}
