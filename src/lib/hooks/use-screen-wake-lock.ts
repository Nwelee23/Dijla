"use client";

import { useEffect } from "react";

type Sentinel = { release: () => Promise<void> };

/**
 * Hold a screen wake lock while `enabled` (UX_IMPROVEMENTS_SPEC §C.1). Used by
 * the driver app during an active delivery and by the kitchen board.
 *
 * The Wake Lock API needs HTTPS + a visible page and is not in every browser, so
 * it is feature-detected and degrades silently. A hidden tab drops the lock, so
 * it is re-acquired on `visibilitychange`.
 */
export function useScreenWakeLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    // Typed locally so the build does not depend on lib.dom shipping Wake Lock.
    const wakeLock = (
      navigator as Navigator & {
        wakeLock?: { request: (type: "screen") => Promise<Sentinel> };
      }
    ).wakeLock;
    if (!wakeLock) return;

    let sentinel: Sentinel | null = null;
    let released = false;

    const request = async () => {
      try {
        sentinel = await wakeLock.request("screen");
      } catch {
        // Denied or not allowed right now — let the screen sleep.
      }
    };
    void request();

    const onVisible = () => {
      if (document.visibilityState === "visible" && !released) void request();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      released = true;
      document.removeEventListener("visibilitychange", onVisible);
      void sentinel?.release().catch(() => {});
    };
  }, [enabled]);
}
