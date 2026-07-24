/**
 * Build the admin churn-risk rows (UX_IMPROVEMENTS_SPEC §A.3): dormant
 * restaurants joined with their tier/status and latest outreach, excluding those
 * still in their first week (no baseline) and any already cancelled, sorted by
 * days dormant. Pure and unit-tested; kept out of the page so the "now"-based
 * cutoff isn't computed in a component's render.
 */

export type ChurnRow = {
  id: string;
  name: string;
  area: string | null;
  phone: string | null;
  daysDormant: number;
  lifetimeOrders: number;
  tier: string;
  status: string;
  lastOutreachAt: string | null;
};

export type DormantRow = {
  restaurant_id: string;
  name: string;
  area: string | null;
  phone: string | null;
  days_dormant: number;
  lifetime_orders: number;
};

export type RestaurantMeta = {
  id: string;
  created_at: string | null;
  status: string;
  tier: string;
};

export type OutreachRow = { restaurant_id: string; created_at: string | null };

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function buildChurnRows(
  dormant: DormantRow[],
  restaurants: RestaurantMeta[],
  outreach: OutreachRow[],
  now = Date.now()
): ChurnRow[] {
  const metaById = new Map(restaurants.map((r) => [r.id, r]));

  // outreach is expected newest-first; keep the first (latest) per restaurant.
  const latestOutreach = new Map<string, string>();
  for (const row of outreach) {
    if (!latestOutreach.has(row.restaurant_id) && row.created_at) {
      latestOutreach.set(row.restaurant_id, row.created_at);
    }
  }

  const cutoff = now - WEEK_MS;

  return dormant
    .map((d) => ({ d, meta: metaById.get(d.restaurant_id) }))
    .filter(
      ({ meta }) =>
        meta != null &&
        meta.status !== "cancelled" &&
        (meta.created_at ? Date.parse(meta.created_at) <= cutoff : true)
    )
    .map(({ d, meta }) => ({
      id: d.restaurant_id,
      name: d.name,
      area: d.area,
      phone: d.phone,
      daysDormant: d.days_dormant,
      lifetimeOrders: Number(d.lifetime_orders),
      tier: meta!.tier,
      status: meta!.status,
      lastOutreachAt: latestOutreach.get(d.restaurant_id) ?? null,
    }))
    .sort((a, b) => b.daysDormant - a.daysDormant);
}
