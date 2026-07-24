import { redirect } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, LineChart, ShieldCheck, Store } from "lucide-react";

import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { StaffThemeScope } from "@/components/theme/staff-theme-scope";
import { requireAdmin } from "@/lib/admin";
import { getUser } from "@/lib/auth/user";
import { getT } from "@/lib/i18n/server";
import { Button } from "@/components/ui/button";

/**
 * Guards the whole admin panel.
 *
 * The proxy has already required a signed-in user on /admin; this is where the
 * role is enforced, from the profile the proxy does not fetch. Anyone who is not
 * an admin is sent to the dashboard — the admin panel does not acknowledge its
 * own existence to a non-admin beyond the redirect. Every action re-checks the
 * same, so this layout is the convenience, not the fence.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  if (!user) redirect("/login");

  if (!(await requireAdmin())) redirect("/dashboard");

  const t = await getT();

  return (
    // Dark by default for the admin panel (DRIVER_REPORTS_ADMIN_SPEC §1).
    <StaffThemeScope className="flex min-h-dvh flex-col">
      <header className="bg-background sticky top-0 z-10 border-b">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3 p-3">
          <span className="flex items-center gap-2 font-bold">
            <ShieldCheck className="size-5" />
            {t.admin.title}
          </span>

          <nav className="flex items-center gap-1">
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin">
                <Store />
                {t.admin.restaurants}
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/growth">
                <LineChart />
                {t.growth.title}
              </Link>
            </Button>
          </nav>

          <div className="ms-auto flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard">
                <LayoutDashboard />
                {t.admin.toDashboard}
              </Link>
            </Button>
            <LanguageSwitcher variant="ghost" />
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>
    </StaffThemeScope>
  );
}
