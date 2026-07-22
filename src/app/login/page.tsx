import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
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
    <AuthShell
      brand={t.brand.name}
      title={t.auth.loginTitle}
      subtitle={t.auth.loginPasswordSubtitle}
    >
      {/* Only allow relative paths — an absolute `next` would be an open redirect. */}
      <LoginForm next={next?.startsWith("/") ? next : undefined} />
    </AuthShell>
  );
}
