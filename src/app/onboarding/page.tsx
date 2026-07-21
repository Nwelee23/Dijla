import { redirect } from "next/navigation";

import { Brand } from "@/components/layout/brand";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { OnboardingForm } from "@/components/onboarding/onboarding-form";
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

export default async function OnboardingPage() {
  const user = await requireUser();

  // Already onboarded — nothing to do here.
  const profile = await getProfile();
  if (profile) redirect("/dashboard");

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 p-4">
      <div className="flex items-center justify-between">
        <Brand />
        <SignOutButton />
      </div>

      <Card>
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
          </p>
          <OnboardingForm />
        </CardContent>
      </Card>
    </main>
  );
}
