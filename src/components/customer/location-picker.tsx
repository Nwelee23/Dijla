"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type * as L from "leaflet";
import { Crosshair, Loader2, MapPin } from "lucide-react";

import { useT } from "@/components/i18n/i18n-provider";
import { Button } from "@/components/ui/button";

import "leaflet/dist/leaflet.css";

export type Pin = { lat: number; lng: number };

/** Najaf city centre — where the pilot is, and a sane place to start the map. */
const NAJAF: Pin = { lat: 31.9954, lng: 44.3148 };

/** Below this the pin is precise enough for a driver to find the door. */
const GOOD_ACCURACY_METRES = 60;

/**
 * Drops a GPS pin on a map.
 *
 * This is the whole reason the product can do delivery in Iraq: street
 * addresses here are not a thing a driver can navigate to, so the order carries
 * a coordinate and a landmark instead of a street name.
 *
 * Leaflet is loaded inside an effect rather than imported at module scope
 * because it touches `window` on import and would break server rendering.
 */
export function LocationPicker({
  value,
  onChange,
}: {
  value: Pin | null;
  onChange: (pin: Pin) => void;
}) {
  const t = useT();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  // Held in a ref so the Leaflet callbacks below always call the current
  // handler without the map effect having to re-run and rebuild the map.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const [isLocating, setIsLocating] = useState(false);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const leaflet = (await import("leaflet")).default;
      if (cancelled || !containerRef.current || mapRef.current) return;

      const start = value ?? NAJAF;
      const map = leaflet.map(containerRef.current, {
        center: [start.lat, start.lng],
        zoom: value ? 17 : 13,
        // The page scrolls; a map that eats the wheel traps the customer inside it.
        scrollWheelZoom: false,
        attributionControl: true,
      });

      leaflet
        .tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: "&copy; OpenStreetMap",
        })
        .addTo(map);

      // A divIcon avoids Leaflet's default marker images, which resolve to
      // bundler-mangled paths and 404 in production.
      const icon = leaflet.divIcon({
        className: "",
        html: `<div style="width:28px;height:28px;border-radius:9999px;background:#008383;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.4)"></div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = leaflet
        .marker([start.lat, start.lng], { draggable: true, icon })
        .addTo(map);

      marker.on("dragend", () => {
        const { lat, lng } = marker.getLatLng();
        setAccuracy(null); // Moved by hand — the GPS reading no longer describes it.
        onChangeRef.current({ lat, lng });
      });

      // Tapping the map is easier than dragging a small circle on a phone.
      map.on("click", (event: L.LeafletMouseEvent) => {
        marker.setLatLng(event.latlng);
        setAccuracy(null);
        onChangeRef.current({ lat: event.latlng.lat, lng: event.latlng.lng });
      });

      mapRef.current = map;
      markerRef.current = marker;
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // Deliberately mount-only: re-running would tear down the customer's pin.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const locate = useCallback(() => {
    if (!navigator.geolocation) {
      setError(t.location.unsupported);
      return;
    }

    setIsLocating(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const pin = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setAccuracy(position.coords.accuracy);
        setIsLocating(false);

        markerRef.current?.setLatLng([pin.lat, pin.lng]);
        mapRef.current?.setView([pin.lat, pin.lng], 17);
        onChangeRef.current(pin);
      },
      (geoError) => {
        setIsLocating(false);
        // Denied is the common case and is not a failure: the customer places
        // the pin by hand instead, which is why the map is always visible.
        setError(
          geoError.code === geoError.PERMISSION_DENIED
            ? t.location.denied
            : t.location.failed
        );
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 }
    );
  }, [t]);

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        className="h-56 w-full overflow-hidden rounded-xl border"
        // Leaflet needs a real height before it can measure itself.
        style={{ minHeight: "14rem" }}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" onClick={locate} disabled={isLocating}>
          {isLocating ? <Loader2 className="animate-spin" /> : <Crosshair />}
          {isLocating ? t.location.locating : t.location.useMyLocation}
        </Button>

        {value && (
          <span className="text-muted-foreground flex items-center gap-1 text-xs">
            <MapPin className="size-3.5" />
            {accuracy === null
              ? t.location.pinSet
              : accuracy <= GOOD_ACCURACY_METRES
                ? t.location.accurate
                : t.location.roughAccuracy}
          </span>
        )}
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      <p className="text-muted-foreground text-xs">{t.location.dragHint}</p>
    </div>
  );
}
