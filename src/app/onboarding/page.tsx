import { redirect } from "next/navigation";

import { Brand } from "@/components/layout/brand";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { OnboardingForm } from "@/components/onboarding/onboarding-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getProfile, requireUser } from "@/lib/auth/user";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata() {
  const t = await getT();
  return { title: t.meta.onboarding };
}

export default async function OnboardingPage() {
  const [user, t] = await Promise.all([requireUser(), getT()]);

  // Already onboarded — nothing to do here.
  const profile = await getProfile();
  if (profile) redirect("/dashboard");

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 p-4">
      <div className="flex items-center justify-between">
        <Brand />
        <div className="flex items-center gap-1">
          <LanguageSwitcher />
          <SignOutButton />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.onboarding.title}</CardTitle>
          <CardDescription>
            {t.onboarding.subtitle}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm">
            {t.onboarding.signedInAs}{" "}
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
