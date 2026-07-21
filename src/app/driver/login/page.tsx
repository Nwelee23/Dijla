import { redirect } from "next/navigation";
import { Bike } from "lucide-react";

import { DriverLoginForm } from "@/components/driver/driver-login-form";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getProfile } from "@/lib/auth/user";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata() {
  const t = await getT();
  return { title: `${t.driverAuth.title} | ${t.brand.name}` };
}

export default async function DriverLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ disabled?: string }>;
}) {
  // Already signed in as a driver — skip the form. A non-driver who lands here
  // is sent to their own home rather than shown a login they cannot use.
  const profile = await getProfile();
  if (profile?.role === "driver") redirect("/driver");
  if (profile) redirect("/dashboard");

  const [{ disabled }, t] = await Promise.all([searchParams, getT()]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-4">
      <div className="flex items-center gap-2 text-2xl font-bold">
        <Bike className="size-7" />
        {t.brand.name}
      </div>
      <LanguageSwitcher variant="outline" />
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t.driverAuth.title}</CardTitle>
          <CardDescription>{t.driverAuth.subtitle}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {disabled && (
            <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              {t.driverAuth.disabledNotice}
            </p>
          )}
          <DriverLoginForm />
        </CardContent>
      </Card>
    </main>
  );
}
