import { Store } from "lucide-react";

import { AdminRestaurantList } from "@/components/admin/admin-restaurant-list";
import { AdminStats } from "@/components/admin/admin-stats";
import { requireAdmin } from "@/lib/admin";
import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata() {
  const t = await getT();
  return { title: `${t.admin.title} | ${t.brand.name}` };
}

export default async function AdminPage() {
  const [t, supabase] = await Promise.all([getT(), createClient()]);

  // Both RPCs are gated by is_platform_admin() in SQL, so they return data only
  // for an admin. requireAdmin() is the layout's job; here the SQL gate is the
  // second lock, and empty results render empty rather than leak.
  await requireAdmin();
  const [{ data: statsRows }, { data: list }] = await Promise.all([
    supabase.rpc("admin_platform_stats"),
    supabase.rpc("admin_restaurants"),
  ]);
  const stats = statsRows?.[0] ?? null;
  const restaurants = list ?? [];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Store className="size-6" />
          {t.admin.restaurants}
        </h1>
        <p className="text-muted-foreground text-sm">{t.admin.subtitle}</p>
      </div>

      {stats && <AdminStats stats={stats} />}

      <AdminRestaurantList restaurants={restaurants} />
    </div>
  );
}
