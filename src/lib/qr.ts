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
