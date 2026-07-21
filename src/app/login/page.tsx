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

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const [{ next }, t] = await Promise.all([searchParams, getT()]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-4">
      <Brand />
      <LanguageSwitcher variant="outline" />
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t.auth.loginTitle}</CardTitle>
          <CardDescription>
            {t.auth.loginSubtitle}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Only allow relative paths — an absolute `next` would be an open redirect. */}
          <AuthForm
            mode="login"
            next={next?.startsWith("/") ? next : undefined}
          />
        </CardContent>
      </Card>
    </main>
  );
}
