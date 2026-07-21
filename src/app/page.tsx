import Link from "next/link";

import { Brand } from "@/components/layout/brand";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { Button } from "@/components/ui/button";
import { getUser } from "@/lib/auth/user";
import { getT } from "@/lib/i18n/server";

export default async function Home() {
  const [user, t] = await Promise.all([getUser(), getT()]);

  return (
    <>
      <header className="border-b">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
          <Brand />
          <div className="flex items-center gap-1">
            <LanguageSwitcher />
            <Button asChild variant="ghost" size="sm">
              <Link href={user ? "/dashboard" : "/login"}>
                {user ? t.nav.dashboard : t.home.signIn}
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold">{t.brand.name}</h1>
          <p className="text-muted-foreground max-w-sm text-balance">
            {t.home.tagline}
          </p>
        </div>
      </main>
    </>
  );
}
