import { redirect } from "next/navigation";

import { Brand } from "@/components/layout/brand";
import { SignOutButton } from "@/components/layout/sign-out-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getProfile, requireUser } from "@/lib/auth/user";

export const metadata = {
  title: "إعداد المطعم | دجلة",
};

/**
 * Placeholder. Task 1.2 turns this into the restaurant-creation form
 * (name, slug, phone, area, logo) plus the owner profile insert.
 */
export default async function OnboardingPage() {
  const user = await requireUser();

  // Already onboarded — nothing to do here.
  const profile = await getProfile();
  if (profile) redirect("/dashboard");

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-4">
      <Brand />
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>أهلاً بك في دجلة</CardTitle>
          <CardDescription>
            خطوة أخيرة: أنشئ مطعمك لتبدأ ببناء قائمتك.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm">
            سجّلت الدخول بـ{" "}
            <span className="text-foreground font-medium" dir="ltr">
              {user.email}
            </span>
            .
          </p>
          <p className="text-muted-foreground text-sm">
            نموذج إنشاء المطعم يُبنى في المهمة 1.2.
          </p>
          <SignOutButton />
        </CardContent>
      </Card>
    </main>
  );
}
