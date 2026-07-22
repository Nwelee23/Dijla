import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata() {
  const t = await getT();
  return { title: t.auth.forgotTitle };
}

/**
 * Account recovery (AUTH_UI_SPEC §3.3). Email is the recovery anchor while there
 * is no SMS provider: a code goes to the account email, then a new password is
 * set and every other session is signed out.
 */
export default async function ForgotPasswordPage() {
  const t = await getT();

  return (
    <AuthShell
      brand={t.brand.name}
      title={t.auth.forgotTitle}
      subtitle={t.auth.forgotSubtitle}
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
