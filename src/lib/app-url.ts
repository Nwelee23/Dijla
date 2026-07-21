import "server-only";

import { headers } from "next/headers";

/**
 * The public origin this app is reachable at.
 *
 * This is what gets baked into every printed QR sticker, so getting it wrong is
 * expensive in a way most config mistakes are not: the restaurant prints thirty
 * stickers, puts them on tables, and only discovers the problem when a diner
 * scans one. Hence the explicit env var first and the loud check in `qrWarning`.
 */
export async function appUrl(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");

  // Vercel sets this per deployment; useful before a custom domain exists.
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;

  // Last resort: whatever host served this request.
  const headerList = await headers();
  const host = headerList.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}

/**
 * Whether the origin is one a printed sticker must never carry.
 * A QR pointing at localhost works on the owner's laptop and nowhere else.
 */
export function isUnprintableOrigin(origin: string): boolean {
  return /localhost|127\.0\.0\.1|0\.0\.0\.0|\.local(:|$)/i.test(origin);
}
