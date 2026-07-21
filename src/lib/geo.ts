/**
 * Is this coordinate plausibly a delivery address in Iraq?
 *
 * `navigator.geolocation` does not always mean GPS. On a laptop with no GPS
 * chip — and on a phone with location services degraded — the browser falls
 * back to IP geolocation, and behind a VPN that lands the customer in Frankfurt
 * with a confident-looking accuracy radius. The customer sees a pin, believes
 * they have given their location, and the restaurant gets a map thumbnail of
 * Germany.
 *
 * A wrong pin is worse than no pin: no pin makes the landmark mandatory, while
 * a wrong one gets trusted by a driver. So a coordinate this far from the
 * service area is treated as absent, and the landmark is required instead.
 *
 * The box is deliberately generous — the whole country plus a margin. It exists
 * to catch a pin on the wrong continent, not to police a border.
 */

const IRAQ = {
  minLat: 28.5,
  maxLat: 37.5,
  minLng: 38.5,
  maxLng: 49.0,
} as const;

export function isPlausibleIraqPin(
  lat: number | null,
  lng: number | null
): boolean {
  if (lat === null || lng === null) return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;

  return (
    lat >= IRAQ.minLat &&
    lat <= IRAQ.maxLat &&
    lng >= IRAQ.minLng &&
    lng <= IRAQ.maxLng
  );
}
