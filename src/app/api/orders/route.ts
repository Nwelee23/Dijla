import { getOpenState } from "@/lib/opening";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  RATE_LIMIT_MAX_ORDERS,
  RATE_LIMIT_WINDOW_MINUTES,
  parseOrderRequest,
  type OrderError,
  type PlaceOrderResponse,
} from "@/lib/orders";

function fail(error: OrderError, status: number) {
  return Response.json({ ok: false, error } satisfies PlaceOrderResponse, {
    status,
  });
}

/**
 * Anonymous dine-in order placement.
 *
 * This is the one write path open to someone with no account, so it assumes the
 * request is hostile:
 *
 * - The browser sends item ids and quantities. It never sends a price, and any
 *   it did send would be ignored — every unit price and the totals are re-read
 *   from the database here. A diner editing localStorage cannot change the bill.
 * - Items are checked to belong to this restaurant, to be available, and to sit
 *   in an active category — the same rule that decides what the menu shows, so
 *   a hidden dish cannot be ordered by crafting a request.
 * - The service_role key bypasses RLS, which is exactly why nothing from the
 *   request is trusted as an identity: the qr_token is the only thing that
 *   decides which restaurant this order can touch.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("invalid_request", 400);
  }

  const parsed = parseOrderRequest(body);
  if (!parsed.ok) return fail(parsed.error, 400);

  const { qrToken, requestId, lines } = parsed.value;
  const admin = createAdminClient();

  // 1. The token decides the restaurant. Nothing else in the request does.
  const { data: table } = await admin
    .from("tables")
    .select("id, restaurant_id, is_active, restaurants(id, is_active, settings)")
    .eq("qr_token", qrToken)
    .maybeSingle();

  const restaurant = table?.restaurants;
  if (!table?.is_active || !restaurant?.is_active) {
    return fail("invalid_table", 404);
  }

  // 2. Refuse orders outside opening hours. Checked here and not only in the UI:
  //    an order placed at 3am lands on a screen nobody is watching, and the
  //    diner is left waiting for food that will never come.
  if (!getOpenState(restaurant.settings).isOpen) {
    return fail("closed", 409);
  }

  // 3. Rate limit per table, so a leaked sticker cannot flood a kitchen.
  const since = new Date(
    Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60_000
  ).toISOString();

  const { count: recentCount } = await admin
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("table_id", table.id)
    .gte("created_at", since);

  if ((recentCount ?? 0) >= RATE_LIMIT_MAX_ORDERS) {
    return fail("rate_limited", 429);
  }

  // 4. Re-read the menu. This is the authoritative price list.
  const itemIds = [...new Set(lines.map((line) => line.itemId))];
  const { data: items } = await admin
    .from("menu_items")
    .select("id, name, price, is_available, menu_categories(is_active)")
    .eq("restaurant_id", table.restaurant_id)
    .in("id", itemIds);

  const byId = new Map(
    (items ?? [])
      .filter((item) => item.is_available && item.menu_categories?.is_active)
      .map((item) => [item.id, item])
  );

  // Every requested id must survive that filter, or the order is refused
  // outright — quietly dropping a line would hand the diner food they did not
  // order and a bill that does not match.
  if (byId.size !== itemIds.length) {
    return fail("unavailable_items", 409);
  }

  const priced = lines.map((line) => {
    const item = byId.get(line.itemId)!;
    const unitPrice = Number(item.price);
    return {
      itemId: item.id,
      nameSnapshot: item.name,
      priceSnapshot: unitPrice,
      quantity: line.quantity,
      note: line.note || null,
      lineTotal: unitPrice * line.quantity,
    };
  });

  const subtotal = priced.reduce((sum, line) => sum + line.lineTotal, 0);
  const total = subtotal; // Dine-in carries no delivery fee.

  // 5. Per-restaurant counter, so staff say "order 14", not a uuid.
  const { data: orderNumber, error: numberError } = await admin.rpc(
    "next_order_number",
    { rid: table.restaurant_id }
  );

  if (numberError || typeof orderNumber !== "number") {
    return fail("server_error", 500);
  }

  const { data: order, error: orderError } = await admin
    .from("orders")
    .insert({
      restaurant_id: table.restaurant_id,
      table_id: table.id,
      order_number: orderNumber,
      client_request_id: requestId,
      type: "dine_in",
      status: "new",
      subtotal,
      delivery_fee: 0,
      total,
      payment_method: "cash",
      payment_status: "unpaid",
    })
    .select("id, order_number")
    .single();

  if (orderError) {
    // 23505 on client_request_id: this submission already landed — a double-tap,
    // or a retry after the first response was lost. Hand back the original
    // rather than a second ticket for the same food.
    if (orderError.code === "23505") {
      const { data: existing } = await admin
        .from("orders")
        .select("id, order_number")
        .eq("client_request_id", requestId)
        .maybeSingle();

      if (existing) {
        return Response.json({
          ok: true,
          orderId: existing.id,
          orderNumber: existing.order_number,
        } satisfies PlaceOrderResponse);
      }
    }
    return fail("server_error", 500);
  }

  if (!order) return fail("server_error", 500);

  const { error: itemsError } = await admin.from("order_items").insert(
    priced.map((line) => ({
      order_id: order.id,
      menu_item_id: line.itemId,
      name_snapshot: line.nameSnapshot,
      price_snapshot: line.priceSnapshot,
      quantity: line.quantity,
      notes: line.note,
      options_snapshot: [],
    }))
  );

  if (itemsError) {
    // An order with no lines is worse than no order: the kitchen sees a ticket
    // it cannot cook. Roll it back rather than leave that on a screen.
    await admin.from("orders").delete().eq("id", order.id);
    return fail("server_error", 500);
  }

  return Response.json({
    ok: true,
    orderId: order.id,
    orderNumber: order.order_number,
  } satisfies PlaceOrderResponse);
}
