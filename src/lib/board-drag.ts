import { type OrderStatus } from "@/lib/order-status";

/**
 * The three kanban lanes, in forward order (ORDERS_DASHBOARD_SPEC §1).
 * Dragging a card between them advances its status (UX_IMPROVEMENTS_SPEC §D.1).
 */
export const LANE_KEYS = ["new", "preparing", "ready"] as const;
export type LaneKey = (typeof LANE_KEYS)[number];

/**
 * Which lane a status lives in. `accepted` shares the preparing lane and
 * `out_for_delivery` shares ready, mirroring the board's column grouping, so a
 * dragged card always maps to exactly one lane.
 */
const LANE_OF: Record<string, LaneKey> = {
  new: "new",
  accepted: "preparing",
  preparing: "preparing",
  ready: "ready",
  out_for_delivery: "ready",
};

export function laneOfStatus(status: string): LaneKey | null {
  return LANE_OF[status] ?? null;
}

/**
 * The status an order takes when dropped into a lane — the lane's entry point.
 * A card dropped on "ready" becomes `ready`, never `out_for_delivery`; the
 * driver hand-off stays a deliberate button press, not a drag side effect.
 */
const LANE_ENTRY: Record<LaneKey, OrderStatus> = {
  new: "new",
  preparing: "preparing",
  ready: "ready",
};

export type DropResult =
  | { kind: "forward"; to: OrderStatus }
  | { kind: "same" }
  | { kind: "backward" };

/**
 * Resolve dropping an order (in `status`) onto a target lane.
 *
 * Only forward moves change anything. Dropping on the same lane is a no-op, and
 * a backward drag is rejected by the caller with a toast (§D.1) — status never
 * silently regresses, and the 10-second undo still guards the forward move.
 */
export function resolveDrop(status: string, target: LaneKey): DropResult {
  const from = laneOfStatus(status);
  if (!from) return { kind: "same" };

  const fromIndex = LANE_KEYS.indexOf(from);
  const toIndex = LANE_KEYS.indexOf(target);

  if (toIndex === fromIndex) return { kind: "same" };
  if (toIndex < fromIndex) return { kind: "backward" };
  return { kind: "forward", to: LANE_ENTRY[target] };
}
