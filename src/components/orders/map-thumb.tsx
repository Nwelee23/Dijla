import { tileWindow } from "@/lib/map-tiles";

/**
 * Static preview of a delivery pin.
 *
 * Plain `<img>` tiles positioned by arithmetic — no map library, no client
 * JavaScript. `next/image` is deliberately not used: these are third-party
 * tiles at a fixed size, and routing them through the optimiser would add a
 * server round-trip per tile for no gain.
 */
export function MapThumb({
  lat,
  lng,
  width = 260,
  height = 130,
}: {
  lat: number;
  lng: number;
  width?: number;
  height?: number;
}) {
  const window_ = tileWindow(lat, lng, width, height);

  return (
    <div
      className="bg-muted relative overflow-hidden rounded-lg border"
      style={{ width, height }}
      aria-hidden
    >
      {window_.tiles.map((tile) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={`${tile.x}-${tile.y}`}
          src={tile.url}
          alt=""
          width={256}
          height={256}
          loading="lazy"
          className="absolute max-w-none"
          style={{ left: tile.left, top: tile.top }}
        />
      ))}

      {/* The window is built so the pin lands exactly at the centre. */}
      <span className="bg-brand absolute left-1/2 top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow" />
    </div>
  );
}
