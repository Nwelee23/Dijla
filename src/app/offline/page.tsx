import { WifiOff } from "lucide-react";

import { getT } from "@/lib/i18n/server";

export async function generateMetadata() {
  const t = await getT();
  return { title: t.meta.offline };
}

/** Served by the service worker when a navigation fails. */
export default async function OfflinePage() {
  const t = await getT();

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <WifiOff className="text-muted-foreground size-12" />
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">{t.offline.title}</h1>
        <p className="text-muted-foreground max-w-xs text-balance">
          {t.offline.body}
        </p>
      </div>
    </main>
  );
}
