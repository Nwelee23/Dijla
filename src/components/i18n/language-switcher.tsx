"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Languages, Loader2 } from "lucide-react";

import { setLocale } from "@/app/i18n-actions";
import { useI18n } from "@/components/i18n/i18n-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LOCALES, LOCALE_META, type Locale } from "@/lib/i18n/config";

export function LanguageSwitcher({
  variant = "ghost",
}: {
  variant?: "ghost" | "outline";
}) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function choose(next: Locale) {
    if (next === locale) return;
    startTransition(async () => {
      await setLocale(next);
      // Direction and font change with the locale, so re-render from the root.
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size="sm"
          aria-label={t.common.language}
          disabled={isPending}
        >
          {isPending ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Languages className="size-4" />
          )}
          <span className="hidden sm:inline">{LOCALE_META[locale].name}</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        {LOCALES.map((option) => (
          <DropdownMenuItem
            key={option}
            onSelect={() => choose(option)}
            // Each name is written in its own script, so it needs its own direction.
            dir={LOCALE_META[option].dir}
            className="justify-between gap-4"
          >
            <span>{LOCALE_META[option].name}</span>
            {option === locale && <Check className="size-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
