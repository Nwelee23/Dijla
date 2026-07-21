/**
 * A static map thumbnail, built from raw OpenStreetMap tiles.
 *
 * The dashboard shows one of these per delivery order. Mounting a Leaflet map
 * on every card would ship the library to a restaurant's tablet and fire a
 * dozen tile requests per order; this needs no JavaScript at all and fetches
 * four images, which matters on the connections these run over.
 */

const TILE_SIZE = 256;

/** Close enough to read the street, wide enough to show which one. */
export const THUMB_ZOOM = 16;

export type TileWindow = {
  /** Tiles to draw, with their offset inside the viewport. */
  tiles: { x: number; y: number; left: number; top: number; url: string }[];
  width: number;
  height: number;
};

function project(lat: number, lng: number, zoom: number) {
  const scale = TILE_SIZE * 2 ** zoom;
  const sinLat = Math.sin((lat * Math.PI) / 180);

  return {
    x: ((lng + 180) / 360) * scale,
    y:
      (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale,
  };
}

/**
 * Lays out the tiles needed to centre `lat,lng` in a box of `width x height`.
 *
 * The pin sits at the exact centre of the returned window, so the caller can
 * draw a marker there without any further maths.
 */
export function tileWindow(
  lat: number,
  lng: number,
  width: number,
  height: number,
  zoom: number = THUMB_ZOOM
): TileWindow {
  const centre = project(lat, lng, zoom);

  // Top-left corner of the viewport, in world pixels.
  const originX = centre.x - width / 2;
  const originY = centre.y - height / 2;

  const firstTileX = Math.floor(originX / TILE_SIZE);
  const firstTileY = Math.floor(originY / TILE_SIZE);
  const lastTileX = Math.floor((originX + width) / TILE_SIZE);
  const lastTileY = Math.floor((originY + height) / TILE_SIZE);

  const tiles: TileWindow["tiles"] = [];
  const maxTile = 2 ** zoom;

  for (let x = firstTileX; x <= lastTileX; x++) {
    for (let y = firstTileY; y <= lastTileY; y++) {
      // Wrap horizontally at the date line; clamp vertically, where there is
      // no tile to wrap to.
      if (y < 0 || y >= maxTile) continue;
      const wrappedX = ((x % maxTile) + maxTile) % maxTile;

      tiles.push({
        x: wrappedX,
        y,
        left: x * TILE_SIZE - originX,
        top: y * TILE_SIZE - originY,
        url: `https://tile.openstreetmap.org/${zoom}/${wrappedX}/${y}.png`,
      });
    }
  }

  return { tiles, width, height };
}

/**
 * Deep link that opens the pin in whatever maps app the phone has.
 *
 * This is a restaurant-side action: staff tap it to navigate to a customer who
 * asked to be delivered to. The coordinates only ever leave the device at that
 * moment, and never appear in one of our own URLs.
 */
export function navigationUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}
