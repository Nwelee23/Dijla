import { ClipboardList, MapPin, Phone } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { areaLabel } from "@/lib/areas";
import { formatIraqiPhone } from "@/lib/auth/phone";
import { getT } from "@/lib/i18n/server";
import { getRestaurant } from "@/lib/restaurant";

export async function generateMetadata() {
  const t = await getT();
  return { title: t.meta.orders };
}

export default async function DashboardPage() {
  // The layout already guarantees this exists.
  const [restaurant, t] = await Promise.all([getRestaurant(), getT()]);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold">{t.dashboard.ordersTitle}</h1>
        <p className="text-muted-foreground text-sm">
          {t.dashboard.ordersSubtitle}
        </p>
      </div>

      <Card>
        <CardContent className="text-muted-foreground flex flex-col items-center gap-3 py-10 text-center">
          <ClipboardList className="size-10 opacity-40" />
          <div className="space-y-1">
            <p className="text-foreground font-medium">{t.dashboard.noOrders}</p>
            <p className="text-sm">{t.dashboard.noOrdersHint}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.dashboard.yourRestaurant}</CardTitle>
          <CardDescription>
            {t.dashboard.yourRestaurantHint}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">{t.common.name}</span>
            <span className="font-medium">{restaurant!.name}</span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">{t.dashboard.restaurantLink}</span>
            <code className="font-mono text-xs" dir="ltr">
              /r/{restaurant!.slug}
            </code>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Phone className="size-3.5" />
              {t.common.phone}
            </span>
            <span dir="ltr">
              {restaurant!.phone ? formatIraqiPhone(restaurant!.phone) : "—"}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <MapPin className="size-3.5" />
              {t.common.area}
            </span>
            <span>{areaLabel(t, restaurant!.area) ?? "—"}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
