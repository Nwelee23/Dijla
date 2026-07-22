"use client";

import { useSyncExternalStore } from "react";
import { WifiOff } from "lucide-react";

import { useT } from "@/components/i18n/i18n-provider";

function subscribe(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

/**
 * A thin banner across the top whenever the browser is offline.
 *
 * useSyncExternalStore rather than an effect: connectivity is an external store,
 * and subscribing to it is the correct, tear-free way to read it — no state set
 * in an effect, and the server snapshot is "online" so nothing flashes during
 * hydration. The live order screens have their own reconnecting badge; this is
 * the app-wide signal for every other page.
 */
export function OfflineBanner() {
  const t = useT();
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true
  );

  if (online) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-[60] flex items-center justify-center gap-2 bg-amber-500 px-4 py-1.5 text-sm font-medium text-amber-950">
      <WifiOff className="size-4 shrink-0" />
      {t.offline.banner}
    </div>
  );
}
