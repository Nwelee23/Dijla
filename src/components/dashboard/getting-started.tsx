import Link from "next/link";
import { ArrowLeft, Check, QrCode, Rocket, Share2, UtensilsCrossed } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { appUrl } from "@/lib/app-url";
import { getT } from "@/lib/i18n/server";
import { interpolate } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * The path a new restaurant walks to its first order: build a menu, put a QR on
 * a table, go live. Shown on the order board until that first order lands, then
 * gone for good — it is an onboarding helper, not a permanent fixture, and a
 * restaurant that is already taking orders has no use for it.
 *
 * Each step reads its own done-ness from real data (a menu item exists, a table
 * exists), so it needs no dismiss button and cannot drift from reality: tick a
 * box by doing the thing, not by saying you did.
 */
export async function GettingStarted({
  hasMenu,
  hasTables,
  hasOrders,
  slug,
}: {
  hasMenu: boolean;
  hasTables: boolean;
  hasOrders: boolean;
  slug: string;
}) {
  // Once the first order is in, they are live — nothing left to onboard.
  if (hasOrders) return null;

  const t = await getT();
  const origin = await appUrl();

  const steps = [
    {
      done: hasMenu,
      icon: UtensilsCrossed,
      title: t.start.menuTitle,
      body: t.start.menuBody,
      href: "/dashboard/menu",
      cta: t.start.menuCta,
    },
    {
      done: hasTables,
      icon: QrCode,
      title: t.start.tablesTitle,
      body: t.start.tablesBody,
      href: "/dashboard/tables",
      cta: t.start.tablesCta,
    },
  ];

  const doneCount = steps.filter((step) => step.done).length;
  const ready = hasMenu && hasTables;

  return (
    <Card className="border-primary/30" data-getting-started="">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Rocket className="size-5" />
          {t.start.title}
        </CardTitle>
        <CardDescription>
          {interpolate(t.start.progress, { done: doneCount, total: steps.length })}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        <ul className="space-y-2">
          {steps.map((step) => (
            <li
              key={step.href}
              className={cn(
                "flex items-center gap-3 rounded-lg border p-3",
                step.done && "bg-muted/40"
              )}
            >
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full",
                  step.done
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {step.done ? <Check className="size-4" /> : <step.icon className="size-4" />}
              </span>

              <div className="min-w-0 flex-1">
                <p className={cn("font-medium", step.done && "text-muted-foreground line-through")}>
                  {step.title}
                </p>
                {!step.done && (
                  <p className="text-muted-foreground text-sm">{step.body}</p>
                )}
              </div>

              {!step.done && (
                <Button asChild size="sm" variant="outline" className="shrink-0">
                  <Link href={step.href}>
                    {step.cta}
                    <ArrowLeft className="rtl:rotate-180" />
                  </Link>
                </Button>
              )}
            </li>
          ))}
        </ul>

        {/* Once the menu and a table exist, the restaurant is ready to serve —
            the last nudge is to actually put the QR out or share the link. */}
        {ready && slug && (
          <div className="border-primary/40 bg-primary/5 flex flex-wrap items-center gap-3 rounded-lg border p-3">
            <Share2 className="text-primary size-5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-medium">{t.start.readyTitle}</p>
              <p className="text-muted-foreground truncate text-sm" dir="ltr">
                {origin}/r/{slug}
              </p>
            </div>
            <Button asChild size="sm" className="shrink-0">
              <Link href="/dashboard/tables/print">
                <QrCode />
                {t.start.printCta}
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
