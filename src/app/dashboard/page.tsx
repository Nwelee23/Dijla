import { ClipboardList, MapPin, Phone } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatIraqiPhone } from "@/lib/auth/phone";
import { getRestaurant } from "@/lib/restaurant";

export const metadata = {
  title: "الطلبات | دجلة",
};

export default async function DashboardPage() {
  // The layout already guarantees this exists.
  const restaurant = (await getRestaurant())!;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold">الطلبات</h1>
        <p className="text-muted-foreground text-sm">
          الطلبات المباشرة تصل هنا فور تفعيل الطلب عبر QR.
        </p>
      </div>

      <Card>
        <CardContent className="text-muted-foreground flex flex-col items-center gap-3 py-10 text-center">
          <ClipboardList className="size-10 opacity-40" />
          <div className="space-y-1">
            <p className="text-foreground font-medium">لا توجد طلبات بعد</p>
            <p className="text-sm">
              استقبال الطلبات يبدأ في المرحلة 2 — قائمة QR للطاولات.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>مطعمك</CardTitle>
          <CardDescription>
            تعديل هذه البيانات يصبح متاحاً من الإعدادات في المهمة 1.7.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">الاسم</span>
            <span className="font-medium">{restaurant.name}</span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">رابط المطعم</span>
            <code className="font-mono text-xs" dir="ltr">
              /r/{restaurant.slug}
            </code>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Phone className="size-3.5" />
              الهاتف
            </span>
            <span dir="ltr">
              {restaurant.phone ? formatIraqiPhone(restaurant.phone) : "—"}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <MapPin className="size-3.5" />
              المنطقة
            </span>
            <span>{restaurant.area ?? "—"}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
