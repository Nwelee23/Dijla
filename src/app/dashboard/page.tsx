import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getProfile, requireUser } from "@/lib/auth/user";

export const metadata = {
  title: "لوحة التحكم | دجلة",
};

/**
 * Placeholder. The real dashboard shell is task 1.3.
 * `requireUser()` backs up the middleware rather than replacing it.
 */
export default async function DashboardPage() {
  const user = await requireUser();
  const profile = await getProfile();

  return (
    <main className="mx-auto w-full max-w-2xl p-4 sm:p-6">
      <Card>
        <CardHeader>
          <CardTitle>لوحة التحكم</CardTitle>
          <CardDescription>
            الهيكل الكامل يُبنى في المهمة 1.3.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p>
            <span className="text-muted-foreground">المستخدم: </span>
            {user.email ?? user.phone}
          </p>
          <p>
            <span className="text-muted-foreground">الملف الشخصي: </span>
            {profile
              ? `${profile.full_name ?? "بدون اسم"} — ${profile.role}`
              : "غير موجود بعد (سيُنشأ في مرحلة التسجيل 1.2)"}
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
