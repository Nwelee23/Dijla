import { AuthShell } from "@/components/auth/auth-shell";
import { EmailCodeForm } from "@/components/auth/email-code-form";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata() {
  const t = await getT();
  return { title: t.meta.login };
}

/**
 * Emailed-code sign-in and interim recovery (AUTH_UI_SPEC §3.2/§3.3, adapted to
 * email while there is no SMS provider). A one-time code signs the owner in
 * without a password; from there the password can be reset in settings. The
 * dedicated set-a-new-password reset flow lands in the next task.
 */
export default async function LoginCodePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const [{ next }, t] = await Promise.all([searchParams, getT()]);

  return (
    <AuthShell
      brand={t.brand.name}
      title={t.auth.codeLoginTitle}
      subtitle={t.auth.codeLoginSubtitle}
    >
      <EmailCodeForm next={next?.startsWith("/") ? next : undefined} />
    </AuthShell>
  );
}
