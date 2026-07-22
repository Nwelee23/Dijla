import { DeliveryForm } from "@/components/settings/delivery-form";
import { HoursForm } from "@/components/settings/hours-form";
import { ProfileForm } from "@/components/settings/profile-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { parseHours } from "@/lib/hours";
import { getT } from "@/lib/i18n/server";
import { getRestaurant } from "@/lib/restaurant";
import { getSubscription } from "@/lib/subscription";

export async function generateMetadata() {
  const t = await getT();
  return { title: t.meta.settings };
}

export default async function SettingsPage() {
  // The dashboard layout already guarantees this exists.
  const [restaurant, t, plan] = await Promise.all([
    getRestaurant(),
    getT(),
    getSubscription(),
  ]);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold">{t.settings.title}</h1>
        <p className="text-muted-foreground text-sm">
          {t.settings.subtitle}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.settings.restaurantInfo}</CardTitle>
          <CardDescription>
            {t.settings.restaurantInfoHint}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm restaurant={restaurant!} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.settings.deliverySection}</CardTitle>
          <CardDescription>{t.settings.deliverySectionHint}</CardDescription>
        </CardHeader>
        <CardContent>
          <DeliveryForm
            restaurant={restaurant!}
            canDeliver={plan.canUsePro}
            lock={plan.proLock}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.settings.hours}</CardTitle>
          <CardDescription>
            {t.settings.hoursHint}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <HoursForm initial={parseHours(restaurant!.settings)} />
        </CardContent>
      </Card>
    </div>
  );
}
