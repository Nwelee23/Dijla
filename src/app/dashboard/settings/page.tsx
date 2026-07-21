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
import { getRestaurant } from "@/lib/restaurant";

export const metadata = {
  title: "الإعدادات | دجلة",
};

export default async function SettingsPage() {
  // The dashboard layout already guarantees this exists.
  const restaurant = (await getRestaurant())!;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold">الإعدادات</h1>
        <p className="text-muted-foreground text-sm">
          بيانات مطعمك وأوقات عمله ورسوم التوصيل.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>معلومات المطعم</CardTitle>
          <CardDescription>
            الاسم والشعار يظهران للزبون أعلى القائمة.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm restaurant={restaurant} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>أوقات العمل</CardTitle>
          <CardDescription>
            تُعرض للزبون، وتُستخدم لاحقاً لإيقاف استقبال الطلبات خارج الدوام.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <HoursForm initial={parseHours(restaurant.settings)} />
        </CardContent>
      </Card>
    </div>
  );
}
