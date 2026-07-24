import { redirect } from "next/navigation";

import {
  DashboardMobileNav,
  DashboardSidebar,
} from "@/components/dashboard/dashboard-nav";
import { RestaurantHeader } from "@/components/dashboard/restaurant-header";
import { PushSetup } from "@/components/pwa/push-setup";
import { StaffThemeScope } from "@/components/theme/staff-theme-scope";
import { TrialBanner } from "@/components/dashboard/trial-banner";
import { VerificationBanner } from "@/components/dashboard/verification-banner";
import { TrialExpired } from "@/components/dashboard/trial-expired";
import { getProfile, requireUser } from "@/lib/auth/user";
import { getRestaurant } from "@/lib/restaurant";
import { getSubscription } from "@/lib/subscription";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();

  // These three each hit the database, and every navigation re-runs the whole
  // layout. Run in parallel rather than one after another: the DB is in
  // Frankfurt and the round trips add up, so three sequential waits are the
  // difference a person feels as "heavy" moving between screens. All three are
  // needed for the common case (an owner), and they share the cached getUser,
  // so firing them together costs nothing extra and saves two round trips.
  const [profile, restaurant, subscription] = await Promise.all([
    getProfile(),
    getRestaurant(),
    getSubscription(),
  ]);

  // First sign-in: the account exists but no restaurant is attached to it yet.
  if (!profile) redirect("/onboarding");

  // A driver has a restaurant and would otherwise render the dashboard shell —
  // send them to their own app. The driver layout does the mirror bounce, so
  // the two never overlap.
  if (profile.role === "driver") redirect("/driver");

  // A profile without a readable restaurant means the row was deleted underneath
  // the user. Send them back through onboarding rather than rendering an empty shell.
  if (!restaurant) redirect("/onboarding");

  // Blocks the dashboard only. The customer menu at /t/[qr_token] is a separate
  // route and keeps serving — see TrialExpired for why.
  if (subscription.isExpired) {
    return <TrialExpired phone={process.env.NEXT_PUBLIC_SUPPORT_PHONE} />;
  }

  return (
    // Dark across the whole dashboard by default (ORDERS_DASHBOARD_SPEC §1),
    // scoped to this subtree so customer and auth surfaces are untouched. The
    // scope owns its own dark/light choice, independent of the public theme —
    // see StaffThemeScope.
    <StaffThemeScope className="flex flex-1 flex-col">
      {/* Chrome is screen-only: a printed report (cash sheet, QR sheet) must be
          the content alone, not the nav and header around it. */}
      <div className="print:hidden">
        <RestaurantHeader
          restaurant={restaurant}
          ownerName={profile.full_name}
          isAdmin={profile.role === "admin"}
        />
        <VerificationBanner
          status={restaurant.verification_status}
          note={restaurant.verification_note}
        />
        <TrialBanner state={subscription} />
        <PushSetup />
        <DashboardMobileNav />
      </div>

      <div className="flex flex-1">
        <div className="print:hidden">
          <DashboardSidebar />
        </div>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </StaffThemeScope>
  );
}
