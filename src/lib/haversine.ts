/**
 * Great-circle distance in kilometres (UX_IMPROVEMENTS_SPEC §C.2). Used to order
 * a driver's deliveries by how far each destination is from the restaurant.
 * Pure and unit-tested.
 */

export type LatLng = { lat: number; lng: number };

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

const EARTH_RADIUS_KM = 6371;

export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}
