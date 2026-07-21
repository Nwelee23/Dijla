import { redirect } from "next/navigation";

import {
  DashboardMobileNav,
  DashboardSidebar,
} from "@/components/dashboard/dashboard-nav";
import { RestaurantHeader } from "@/components/dashboard/restaurant-header";
import { TrialBanner } from "@/components/dashboard/trial-banner";
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

  // First sign-in: the account exists but no restaurant is attached to it yet.
  const profile = await getProfile();
  if (!profile) redirect("/onboarding");

  // A profile without a readable restaurant means the row was deleted underneath
  // the user. Send them back through onboarding rather than rendering an empty shell.
  const restaurant = await getRestaurant();
  if (!restaurant) redirect("/onboarding");

  // Blocks the dashboard only. The customer menu at /t/[qr_token] is a separate
  // route and keeps serving — see TrialExpired for why.
  const subscription = await getSubscription();
  if (subscription.isExpired) {
    return <TrialExpired phone={process.env.NEXT_PUBLIC_SUPPORT_PHONE} />;
  }

  return (
    <div className="flex flex-1 flex-col">
      <RestaurantHeader restaurant={restaurant} ownerName={profile.full_name} />
      <TrialBanner state={subscription} />
      <DashboardMobileNav />

      <div className="flex flex-1">
        <DashboardSidebar />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
