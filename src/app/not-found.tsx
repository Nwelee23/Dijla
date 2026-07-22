import Link from "next/link";
import { Compass } from "lucide-react";

import { getT } from "@/lib/i18n/server";
import { Button } from "@/components/ui/button";

/** The 404, in the app's own voice rather than the framework's default. */
export default async function NotFound() {
  const t = await getT();

  return (
    <main className="flex min-h-dvh flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <Compass className="text-muted-foreground size-12" />
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">{t.errors.notFoundTitle}</h1>
        <p className="text-muted-foreground max-w-xs text-balance">
          {t.errors.notFoundBody}
        </p>
      </div>
      <Button asChild>
        <Link href="/">{t.errors.home}</Link>
      </Button>
    </main>
  );
}
