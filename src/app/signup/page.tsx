import { AuthForm } from "@/components/auth/auth-form";
import { Brand } from "@/components/layout/brand";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata() {
  const t = await getT();
  return { title: t.meta.signup };
}

export default async function SignupPage() {
  const t = await getT();

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-4">
      <Brand />
      <LanguageSwitcher variant="outline" />
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t.auth.signupTitle}</CardTitle>
          <CardDescription>
            {t.auth.signupSubtitle}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* After sign-up the user has no profile yet, so /dashboard sends them to onboarding. */}
          <AuthForm mode="signup" next="/onboarding" />
        </CardContent>
      </Card>
    </main>
  );
}
