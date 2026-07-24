import { appUrl } from "@/lib/app-url";
import { qrPng, restaurantUrl } from "@/lib/qr";
import { getRestaurant } from "@/lib/restaurant";

/**
 * PNG download for the restaurant's storefront QR (§9) — the delivery link
 * /r/[slug]. Read through the caller's own session; RLS guarantees an owner only
 * ever gets their own restaurant, never an arbitrary QR generated on our domain.
 */
export async function GET() {
  const restaurant = await getRestaurant();
  if (!restaurant?.slug) {
    return new Response("Not found", { status: 404 });
  }

  const origin = await appUrl();
  const png = await qrPng(restaurantUrl(restaurant.slug, origin));

  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="${restaurant.slug}-qr.png"`,
      "Cache-Control": "no-store",
    },
  });
}
