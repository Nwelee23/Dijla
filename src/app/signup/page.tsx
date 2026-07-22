import { AuthShell } from "@/components/auth/auth-shell";
import { SignupWizard } from "@/components/auth/signup-wizard";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata() {
  const t = await getT();
  return { title: t.meta.signup };
}

export default async function SignupPage() {
  const t = await getT();

  return (
    <AuthShell
      brand={t.brand.name}
      title={t.auth.signupTitle}
      subtitle={t.auth.signupSubtitle}
    >
      <SignupWizard />
    </AuthShell>
  );
}
