import { createAdminClient } from "@/lib/supabase/admin";

/** Calls one table may raise in the window, so the button cannot be spammed. */
const MAX_CALLS = 3;
const WINDOW_MINUTES = 5;

/**
 * "Call a waiter", from the diner's phone.
 *
 * Same posture as order placement: the qr_token is the only thing that decides
 * which restaurant this touches, and nothing else in the request is trusted.
 * A pending call is reused rather than duplicated — pressing the button three
 * times should get attention once, not queue three identical alerts on the
 * counter that staff then have to dismiss one by one.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "invalid_request" }, { status: 400 });
  }

  const qrToken =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>).qrToken
      : null;

  if (typeof qrToken !== "string" || qrToken.length === 0) {
    return Response.json({ ok: false, error: "invalid_request" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: table } = await admin
    .from("tables")
    .select("id, restaurant_id, is_active, restaurants(is_active)")
    .eq("qr_token", qrToken)
    .maybeSingle();

  if (!table?.is_active || !table.restaurants?.is_active) {
    return Response.json({ ok: false, error: "invalid_table" }, { status: 404 });
  }

  // Already waiting? Say yes without adding another alert.
  const { data: pending } = await admin
    .from("waiter_calls")
    .select("id")
    .eq("table_id", table.id)
    .eq("acknowledged", false)
    .limit(1)
    .maybeSingle();

  if (pending) return Response.json({ ok: true });

  const since = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString();
  const { count } = await admin
    .from("waiter_calls")
    .select("id", { count: "exact", head: true })
    .eq("table_id", table.id)
    .gte("created_at", since);

  if ((count ?? 0) >= MAX_CALLS) {
    return Response.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  const { error } = await admin.from("waiter_calls").insert({
    restaurant_id: table.restaurant_id,
    table_id: table.id,
  });

  if (error) {
    return Response.json({ ok: false, error: "server_error" }, { status: 500 });
  }

  return Response.json({ ok: true });
}
