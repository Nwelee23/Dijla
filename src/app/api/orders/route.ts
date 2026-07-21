import { normalizeIraqiPhone } from "@/lib/auth/phone";
import { getOpenState } from "@/lib/opening";
import { canTakeDelivery, planFromRow } from "@/lib/plan";
import {
  RATE_LIMIT_MAX_ORDERS,
  RATE_LIMIT_WINDOW_MINUTES,
  parseOrderRequest,
  type OrderError,
  type PlaceOrderRequest,
  type PlaceOrderResponse,
} from "@/lib/orders";
import { createAdminClient } from "@/lib/supabase/admin";

function fail(error: OrderError, status: number) {
  return Response.json({ ok: false, error } satisfies PlaceOrderResponse, {
    status,
  });
}

type Admin = ReturnType<typeof createAdminClient>;

/** What the request resolved to: which restaurant, and which table if any. */
type Target = {
  restaurantId: string;
  tableId: string | null;
  settings: unknown;
  deliveryFee: number;
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
  minOrder: number;
};

/**
 * Channel settings, read from the restaurant's own row.
 *
 * A row from before 0010 has none of these columns. Missing reads as open, so
 * deploying this ahead of the migration changes nothing — and a restaurant is
 * never switched off by a field that simply is not there yet.
 */
type RestaurantRow = {
  delivery_fee?: number | string | null;
  delivery_enabled?: boolean | null;
  pickup_enabled?: boolean | null;
  min_order?: number | string | null;
};

function channels(restaurant: RestaurantRow) {
  return {
    deliveryFee: Number(restaurant.delivery_fee ?? 0),
    deliveryEnabled: restaurant.delivery_enabled !== false,
    pickupEnabled: restaurant.pickup_enabled !== false,
    minOrder: Number(restaurant.min_order ?? 0),
  };
}

/**
 * Dine-in is vouched for by the table's token; delivery and pickup by the
 * restaurant's public slug. Either way the identifier in the request decides
 * the restaurant — nothing else in the body is allowed to.
 */
async function resolveTarget(
  admin: Admin,
  request: PlaceOrderRequest
): Promise<{ ok: true; value: Target } | { ok: false; error: OrderError }> {
  // `*` rather than a column list, deliberately: this is a service-role read of
  // one row we already trust entirely, and naming a column that does not exist
  // yet makes PostgREST reject the whole query. Listing them would mean every
  // order on the platform failing in the window between this deploying and 0010
  // being applied.
  if (request.mode === "dine_in") {
    const { data: table } = await admin
      .from("tables")
      .select("id, restaurant_id, is_active, restaurants(*)")
      .eq("qr_token", request.qrToken)
      .maybeSingle();

    const restaurant = table?.restaurants;
    if (!table?.is_active || !restaurant?.is_active) {
      return { ok: false, error: "invalid_table" };
    }

    return {
      ok: true,
      value: {
        restaurantId: table.restaurant_id,
        tableId: table.id,
        settings: restaurant.settings,
        ...channels(restaurant),
      },
    };
  }

  const { data: restaurant } = await admin
    .from("restaurants")
    .select("*")
    .eq("slug", request.slug)
    .maybeSingle();

  if (!restaurant?.is_active) return { ok: false, error: "invalid_restaurant" };

  return {
    ok: true,
    value: {
      restaurantId: restaurant.id,
      tableId: null,
      settings: restaurant.settings,
      ...channels(restaurant),
    },
  };
}

/**
 * Anonymous order placement, for dine-in, delivery and pickup.
 *
 * This is the one write path open to someone with no account, so it treats
 * every request as hostile:
 *
 * - The browser sends item ids and quantities. It never sends a price, and any
 *   it did send is ignored — unit prices, the delivery fee and the totals are
 *   all re-read from the database here. Editing localStorage cannot move the
 *   bill by a dinar.
 * - Items must belong to this restaurant, be available, and sit in an active
 *   category: the same rule that decides what the menu shows, so a hidden dish
 *   cannot be ordered by crafting a request.
 * - The service_role key bypasses RLS, which is exactly why nothing in the body
 *   is trusted as identity — only the qr_token or the slug decides which
 *   restaurant an order can touch.
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

  const order = parsed.value;
  const admin = createAdminClient();

  const target = await resolveTarget(admin, order);
  if (!target.ok) return fail(target.error, 404);

  const {
    restaurantId,
    tableId,
    settings,
    deliveryFee,
    deliveryEnabled,
    pickupEnabled,
    minOrder,
  } = target.value;

  // A channel the owner has switched off. The page hides it, but the page is
  // not the guard — anyone can post this body directly, and an owner who turned
  // delivery off has usually done it because they have nobody to drive it.
  //
  // Delivery is also the paid feature, so the subscription is checked in the
  // same breath. Both refusals return the same code on purpose: a customer is
  // told the restaurant is not delivering right now, never that it is behind on
  // a bill. That is between us and the owner.
  if (order.mode === "delivery") {
    const { data: plan } = await admin
      .from("subscriptions")
      .select("tier, status, end_date")
      .eq("restaurant_id", restaurantId)
      .maybeSingle();

    if (!deliveryEnabled || !canTakeDelivery(planFromRow(plan))) {
      return fail("delivery_disabled", 409);
    }
  }
  if (order.mode === "pickup" && !pickupEnabled) {
    return fail("pickup_disabled", 409);
  }

  // Refuse orders outside opening hours. Checked here and not only in the UI:
  // an order placed at 3am lands on a screen nobody is watching, and the
  // customer is left waiting for food that will never come.
  if (!getOpenState(settings).isOpen) return fail("closed", 409);

  // Rate limit. Dine-in is bounded per table, since the token is the thing that
  // could leak; delivery is bounded per phone number, which is the closest
  // thing to an identity an anonymous customer has.
  const since = new Date(
    Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60_000
  ).toISOString();

  const normalisedPhone =
    order.mode === "dine_in" ? null : normalizeIraqiPhone(order.customer.phone);

  let recent = admin
    .from("orders")
    .select("id", { count: "exact", head: true })
    .gte("created_at", since);

  recent =
    order.mode === "dine_in"
      ? recent.eq("table_id", tableId!)
      : recent
          .eq("restaurant_id", restaurantId)
          .eq("customer_phone", normalisedPhone ?? order.customer.phone);

  const { count: recentCount } = await recent;
  if ((recentCount ?? 0) >= RATE_LIMIT_MAX_ORDERS) return fail("rate_limited", 429);

  // Re-read the menu. This is the authoritative price list.
  const itemIds = [...new Set(order.lines.map((line) => line.itemId))];
  const { data: items } = await admin
    .from("menu_items")
    .select("id, name, price, is_available, menu_categories(is_active)")
    .eq("restaurant_id", restaurantId)
    .in("id", itemIds);

  const byId = new Map(
    (items ?? [])
      .filter((item) => item.is_available && item.menu_categories?.is_active)
      .map((item) => [item.id, item])
  );

  // Every requested id must survive that filter, or the order is refused
  // outright — quietly dropping a line would hand the customer food they did
  // not order and a bill that does not match.
  if (byId.size !== itemIds.length) return fail("unavailable_items", 409);

  const priced = order.lines.map((line) => {
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

  // Minimum order, measured against the food and not the bill: counting the
  // delivery fee toward the minimum would let a 3,000 basket clear a 5,000
  // floor on the strength of the fee alone, which is the opposite of what the
  // floor is for. Delivery only — pickup involves no trip to be worth making.
  if (order.mode === "delivery" && minOrder > 0 && subtotal < minOrder) {
    return fail("below_min_order", 409);
  }

  // The fee comes from the restaurant's own row, never from the request.
  // Pickup and dine-in carry none.
  const fee = order.mode === "delivery" ? deliveryFee : 0;
  const total = subtotal + fee;

  // Per-restaurant counter, so staff say "order 14", not a uuid.
  const { data: orderNumber, error: numberError } = await admin.rpc(
    "next_order_number",
    { rid: restaurantId }
  );

  if (numberError || typeof orderNumber !== "number") {
    return fail("server_error", 500);
  }

  const customer =
    order.mode === "dine_in"
      ? {}
      : {
          customer_name: order.customer.name,
          customer_phone: normalisedPhone ?? order.customer.phone,
          customer_landmark: order.customer.landmark || null,
          delivery_notes: order.customer.notes || null,
          customer_lat: order.customer.lat,
          customer_lng: order.customer.lng,
        };

  const { data: created, error: orderError } = await admin
    .from("orders")
    .insert({
      restaurant_id: restaurantId,
      table_id: tableId,
      order_number: orderNumber,
      client_request_id: order.requestId,
      type: order.mode,
      status: "new",
      subtotal,
      delivery_fee: fee,
      total,
      payment_method: "cash",
      payment_status: "unpaid",
      ...customer,
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
        .eq("client_request_id", order.requestId)
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

  if (!created) return fail("server_error", 500);

  const { error: itemsError } = await admin.from("order_items").insert(
    priced.map((line) => ({
      order_id: created.id,
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
    await admin.from("orders").delete().eq("id", created.id);
    return fail("server_error", 500);
  }

  return Response.json({
    ok: true,
    orderId: created.id,
    orderNumber: created.order_number,
  } satisfies PlaceOrderResponse);
}
