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
  return { title: t.meta.login };
}

/**
 * Email-code sign-in and interim recovery (AUTH_UI_SPEC §3.2/§3.3, adapted to
 * email while there is no SMS provider). An emailed one-time code signs the
 * owner in without a password; a later task adds the 6-box OTP polish and a
 * dedicated set-a-new-password step. Kept on the plain light card for now — the
 * river-night glass reaches these screens when they are rebuilt.
 */
export default async function LoginCodePage() {
  const t = await getT();

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-4">
      <Brand />
      <LanguageSwitcher variant="outline" />
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t.auth.loginTitle}</CardTitle>
          <CardDescription>{t.auth.loginSubtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          <AuthForm mode="login" />
        </CardContent>
      </Card>
    </main>
  );
}
