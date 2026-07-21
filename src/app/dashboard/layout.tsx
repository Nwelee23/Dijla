import { redirect } from "next/navigation";

import {
  DashboardMobileNav,
  DashboardSidebar,
} from "@/components/dashboard/dashboard-nav";
import { RestaurantHeader } from "@/components/dashboard/restaurant-header";
import { getProfile, requireUser } from "@/lib/auth/user";
import { getRestaurant } from "@/lib/restaurant";

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

  return (
    <div className="flex flex-1 flex-col">
      <RestaurantHeader restaurant={restaurant} ownerName={profile.full_name} />
      <DashboardMobileNav />

      <div className="flex flex-1">
        <DashboardSidebar />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
