import { customAlphabet } from "nanoid";

/**
 * Table QR tokens.
 *
 * A token is a bearer credential: whoever holds it can open that table's menu
 * and place an order on it (task 2.5). So it must be unguessable — and, because
 * it goes inside a printed QR code, also short.
 *
 * Those pull against each other. 14 characters of this 57-symbol alphabet is
 * ~82 bits, far past brute force, while keeping the whole URL short enough for
 * a low-density QR — bigger modules scan faster on a cheap phone camera under
 * dim restaurant lighting, which is where these actually get used.
 */
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

const nanoid = customAlphabet(ALPHABET, 14);

/**
 * The alphabet omits `0/O` and `1/l/I`: a token is occasionally read aloud or
 * typed from a smudged sticker, and those pairs are where that goes wrong.
 */
export function generateQrToken(): string {
  return nanoid();
}

/** The URL encoded into the printed QR code. */
export function tableUrl(qrToken: string, origin: string): string {
  return `${origin.replace(/\/$/, "")}/t/${qrToken}`;
}

/** The restaurant's public delivery link, encoded into the storefront QR (§9). */
export function restaurantUrl(slug: string, origin: string): string {
  return `${origin.replace(/\/$/, "")}/r/${slug}`;
}

/**
 * Error correction level M recovers ~15% of the symbol.
 *
 * These stickers live on restaurant tables and collect grease, scratches and
 * spilled tea. L would print slightly smaller; M survives a rough month, which
 * matters more than a millimetre.
 */
const ERROR_CORRECTION = "M" as const;

/**
 * QR as inline SVG, for on-screen display and printing.
 *
 * Vector rather than raster on purpose: a printed sticker is only as sharp as
 * the source, and an SVG stays crisp at any size while costing a fraction of a
 * PNG in page weight — which matters on the print-all sheet, where thirty of
 * them render at once.
 */
export async function qrSvg(url: string): Promise<string> {
  const QRCode = await import("qrcode");
  return QRCode.toString(url, {
    type: "svg",
    errorCorrectionLevel: ERROR_CORRECTION,
    margin: 1,
  });
}

/** QR as a PNG buffer, for the per-table download. */
export async function qrPng(url: string): Promise<Buffer> {
  const QRCode = await import("qrcode");
  return QRCode.toBuffer(url, {
    type: "png",
    errorCorrectionLevel: ERROR_CORRECTION,
    margin: 2,
    // Large enough to print at ~8cm without visible pixel edges.
    width: 1024,
  });
}
