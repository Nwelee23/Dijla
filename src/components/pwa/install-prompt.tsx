"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Download, Share, SquarePlus, X } from "lucide-react";

import { useT } from "@/components/i18n/i18n-provider";
import { Button } from "@/components/ui/button";

/** Chrome/Android fires this; it is not in the standard DOM lib types. */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISSED_KEY = "dijla:install-prompt-dismissed";

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari does not support display-mode, it sets navigator.standalone.
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
      true
  );
}

function isIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

/**
 * "Add to Home Screen" banner.
 *
 * Two different worlds: Chrome/Android gives us a real install event, while iOS
 * Safari has no API at all — there we can only show the manual steps.
 */
/**
 * Whether to show the iOS instructions. Read through useSyncExternalStore rather
 * than set from an effect: it depends only on the environment, and this keeps
 * the server snapshot (false) from mismatching during hydration.
 */
function subscribeNothing() {
  return () => {};
}

function getIosEligibility() {
  return isIos() && !isStandalone() && !localStorage.getItem(DISMISSED_KEY);
}

export function InstallPrompt() {
  const t = useT();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null
  );
  const [dismissed, setDismissed] = useState(false);

  const iosEligible = useSyncExternalStore(
    subscribeNothing,
    getIosEligibility,
    () => false
  );

  useEffect(() => {
    if (isStandalone()) return;
    if (localStorage.getItem(DISMISSED_KEY)) return;
    if (isIos()) return;

    const onBeforeInstall = (event: Event) => {
      // Stop Chrome's own mini-infobar so ours is the only prompt.
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };

    const onInstalled = () => {
      setDeferred(null);
      localStorage.setItem(DISMISSED_KEY, "installed");
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, "1");
    setDeferred(null);
    setDismissed(true);
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  }

  const showIosHint = iosEligible && !dismissed;
  if (!deferred && !showIosHint) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="bg-card mx-auto flex max-w-md items-start gap-3 rounded-xl border p-3 shadow-lg">
        <div className="bg-primary/10 rounded-lg p-2">
          <Download className="text-primary size-5" />
        </div>

        <div className="flex-1 space-y-2">
          <div className="space-y-0.5">
            <p className="text-sm font-medium">{t.pwa.install}</p>
            {showIosHint ? (
              <p className="text-muted-foreground flex flex-wrap items-center gap-1 text-sm">
                {t.pwa.iosTap}
                <Share className="inline size-4" />
                {t.pwa.iosThen}
                <SquarePlus className="inline size-4" />
                <span>{t.pwa.iosHint}</span>
              </p>
            ) : (
              <p className="text-muted-foreground text-sm">
                {t.pwa.installHint}
              </p>
            )}
          </div>

          {deferred && (
            <Button size="sm" onClick={install}>
              {t.pwa.installButton}
            </Button>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={dismiss}
          aria-label={t.common.close}
          className="-me-1 -mt-1 shrink-0"
        >
          <X className="size-4" />
        </Button>
      </div>
    </div>
  );
}
