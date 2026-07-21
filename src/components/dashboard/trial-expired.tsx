import { CalendarX, Phone } from "lucide-react";

import { Brand } from "@/components/layout/brand";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { Button } from "@/components/ui/button";
import { getT } from "@/lib/i18n/server";

/**
 * Shown instead of the dashboard once a trial lapses.
 *
 * Deliberately soft, and deliberately limited to the dashboard: the customer
 * menu and the QR codes keep working. A lapsed invoice is between us and the
 * owner — a diner sitting at a table with a scanned code should never be the
 * one who discovers it, and no restaurant should be embarrassed in front of its
 * customers over a payment we chase manually during the pilot.
 */
export async function TrialExpired({ phone }: { phone?: string | null }) {
  const t = await getT();

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex h-14 items-center justify-between border-b px-4">
        <Brand href="/dashboard/orders" />
        <SignOutButton />
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-5 p-6 text-center">
        <CalendarX className="text-muted-foreground size-12" />

        <div className="space-y-2">
          <h1 className="text-2xl font-bold">{t.trial.expiredTitle}</h1>
          <p className="text-muted-foreground text-balance">
            {t.trial.expiredBody}
          </p>
        </div>

        <p className="text-muted-foreground bg-muted/50 rounded-lg p-3 text-sm text-balance">
          {t.trial.expiredNote}
        </p>

        {phone && (
          <Button asChild size="lg">
            <a href={`tel:${phone}`} dir="ltr">
              <Phone />
              {phone}
            </a>
          </Button>
        )}
      </main>
    </div>
  );
}
