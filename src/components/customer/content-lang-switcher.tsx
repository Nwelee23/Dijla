"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { setLocale } from "@/app/i18n-actions";
import { useContentLang } from "@/lib/hooks/use-content-lang";
import type { ContentLang } from "@/lib/menu";
import { cn } from "@/lib/utils";

/**
 * The customer menu language pill (REDESIGN_V2_SPEC §4.1, §10): ع | En | فا.
 * Switches which language the dish names/descriptions render in. Arabic and
 * English also flip the UI locale so the chrome matches; Persian keeps the
 * RTL Arabic chrome (there is no Persian UI dictionary) while showing Persian
 * content. Styled for the coloured header.
 */
const OPTIONS: { lang: ContentLang; label: string }[] = [
  { lang: "ar", label: "ع" },
  { lang: "en", label: "En" },
  { lang: "fa", label: "فا" },
];

export function ContentLangSwitcher() {
  const { lang, setLang } = useContentLang();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function choose(next: ContentLang) {
    if (next === lang) return;
    setLang(next);
    startTransition(async () => {
      await setLocale(next === "fa" ? "ar" : next);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-0.5 rounded-full bg-white/15 p-0.5 backdrop-blur">
      {OPTIONS.map((option) => (
        <button
          key={option.lang}
          type="button"
          onClick={() => choose(option.lang)}
          disabled={isPending}
          aria-pressed={lang === option.lang}
          className={cn(
            "min-w-7 rounded-full px-2 py-0.5 text-sm font-medium text-white transition-colors",
            lang === option.lang ? "bg-white/25" : "hover:bg-white/10"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
