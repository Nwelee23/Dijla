import { redirect } from "next/navigation";

import { StaffThemeScope } from "@/components/theme/staff-theme-scope";
import { getProfile, getUser } from "@/lib/auth/user";

/**
 * Guards the driver app.
 *
 * This layout wraps only the `(app)` group — the `/driver/login` page sits
 * outside it, so the guard cannot fight the login screen into a redirect loop.
 *
 * The proxy has already guaranteed a signed-in user and sends an anonymous one
 * to /driver/login. Role and standing are enforced here, because both need the
 * profile the proxy deliberately does not fetch:
 *
 * - A non-driver (owner/staff) is bounced to their own dashboard, so the two
 *   apps never bleed into each other.
 * - A driver deactivated mid-shift is signed out on their next navigation. The
 *   check is here, not only at login, so revoking a driver takes effect without
 *   waiting for their session to expire.
 */
export default async function DriverAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  if (!user) redirect("/driver/login");

  const profile = await getProfile();

  if (!profile || profile.role !== "driver") redirect("/dashboard");
  if (profile.is_active === false) redirect("/driver/login?disabled=1");

  // Dark by default for the driver app (DRIVER_REPORTS_ADMIN_SPEC §1), on the
  // same scope and the same tokens as the dashboard.
  return (
    <StaffThemeScope className="flex min-h-dvh flex-col">
      {children}
    </StaffThemeScope>
  );
}
