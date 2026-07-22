import { Store } from "lucide-react";

import { AdminRestaurantList } from "@/components/admin/admin-restaurant-list";
import { requireAdmin } from "@/lib/admin";
import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata() {
  const t = await getT();
  return { title: `${t.admin.title} | ${t.brand.name}` };
}

export default async function AdminPage() {
  const [t, supabase] = await Promise.all([getT(), createClient()]);

  // admin_restaurants() is gated by is_platform_admin() in SQL, so it returns
  // rows only for an admin. requireAdmin() is the layout's job; here the RPC is
  // the second lock, and null means we render an empty list rather than leak.
  await requireAdmin();
  const { data } = await supabase.rpc("admin_restaurants");
  const restaurants = data ?? [];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Store className="size-6" />
          {t.admin.restaurants}
        </h1>
        <p className="text-muted-foreground text-sm">{t.admin.subtitle}</p>
      </div>

      <AdminRestaurantList restaurants={restaurants} />
    </div>
  );
}
