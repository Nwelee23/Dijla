"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Loader2, Share } from "lucide-react";
import { toast } from "sonner";

import {
  removePushSubscription,
  savePushSubscription,
} from "@/app/dashboard/push-actions";
import { useT } from "@/components/i18n/i18n-provider";
import { Button } from "@/components/ui/button";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

/** Web Push wants the applicationServerKey as bytes, not the base64url string.
 *  Built on an explicit ArrayBuffer so the type satisfies BufferSource. */
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized);
  const buffer = new ArrayBuffer(raw.length);
  const out = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

type Status =
  | "loading"
  | "unsupported"
  | "ios-install"
  | "default"
  | "denied"
  | "on";

/**
 * Turns Web Push on for this device (REDESIGN_V2_SPEC §11): asks permission,
 * subscribes, and stores the subscription. Renders a slim banner in the staff
 * chrome — a prompt when off, a persistent warning when blocked, iOS install
 * instructions when needed, and a disable control when on.
 */
export function PushSetup() {
  const t = useT();
  const [status, setStatus] = useState<Status>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function detect(): Promise<Status> {
      if (!VAPID_PUBLIC_KEY) return "unsupported";

      const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
      const standalone =
        ("standalone" in navigator &&
          (navigator as unknown as { standalone?: boolean }).standalone) ||
        window.matchMedia("(display-mode: standalone)").matches;
      // iOS only delivers push to an installed PWA (16.4+).
      if (isIos && !standalone) return "ios-install";

      const supported =
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window;
      if (!supported) return "unsupported";
      if (Notification.permission === "denied") return "denied";

      const registration = await navigator.serviceWorker.getRegistration();
      const existing = registration
        ? await registration.pushManager.getSubscription()
        : null;
      return existing ? "on" : "default";
    }

    detect()
      .then((next) => {
        if (!cancelled) setStatus(next);
      })
      .catch(() => {
        if (!cancelled) setStatus("default");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function enable() {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "default");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY as string),
      });
      const json = subscription.toJSON();
      const result = await savePushSubscription(
        subscription.endpoint,
        json.keys?.p256dh ?? "",
        json.keys?.auth ?? "",
        navigator.userAgent
      );
      if (result.ok) {
        setStatus("on");
        toast.success(t.push.enabled);
      } else {
        toast.error(t.push.failed);
      }
    } catch {
      toast.error(t.push.failed);
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = registration
        ? await registration.pushManager.getSubscription()
        : null;
      if (subscription) {
        await subscription.unsubscribe();
        await removePushSubscription(subscription.endpoint);
      }
      setStatus("default");
    } catch {
      toast.error(t.push.failed);
    } finally {
      setBusy(false);
    }
  }

  if (status === "loading" || status === "unsupported") return null;

  if (status === "ios-install") {
    return (
      <div className="bg-brand-muted text-foreground flex items-center gap-2 border-b px-4 py-2 text-sm">
        <Share className="text-brand size-4 shrink-0" />
        <span>{t.push.iosInstall}</span>
      </div>
    );
  }

  if (status === "denied") {
    return (
      <div className="text-muted-foreground flex items-center gap-2 border-b px-4 py-2 text-sm">
        <BellOff className="size-4 shrink-0" />
        <span>{t.push.denied}</span>
      </div>
    );
  }

  if (status === "on") {
    return (
      <div className="text-muted-foreground flex items-center justify-end gap-2 border-b px-4 py-1.5 text-xs">
        <Bell className="text-brand size-3.5" />
        <span>{t.push.enabled}</span>
        <button
          type="button"
          className="underline underline-offset-2"
          onClick={disable}
          disabled={busy}
        >
          {t.push.disable}
        </button>
      </div>
    );
  }

  // default — prompt to enable.
  return (
    <div className="bg-brand-muted text-foreground flex items-center justify-between gap-3 border-b px-4 py-2 text-sm">
      <span className="flex items-center gap-2">
        <Bell className="text-brand size-4 shrink-0" />
        {t.push.prompt}
      </span>
      <Button size="sm" onClick={enable} disabled={busy}>
        {busy && <Loader2 className="animate-spin" />}
        {t.push.enable}
      </Button>
    </div>
  );
}
