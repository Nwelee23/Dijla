import Link from "next/link";
import { redirect } from "next/navigation";

import { Brand } from "@/components/layout/brand";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { getProfile, requireUser } from "@/lib/auth/user";
import { cn } from "@/lib/utils";

/**
 * Minimal dashboard shell. Task 1.3 replaces this with the real sidebar and
 * scopes the header to the signed-in restaurant.
 */
const NAV = [
  { href: "/dashboard", label: "الطلبات", enabled: false },
  { href: "/dashboard/menu", label: "القائمة", enabled: false },
  { href: "/dashboard/tables", label: "الطاولات", enabled: false },
  { href: "/dashboard/drivers", label: "السائقون", enabled: false },
  { href: "/dashboard/reports", label: "التقارير", enabled: false },
  { href: "/dashboard/settings", label: "الإعدادات", enabled: false },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();

  // First sign-in: the account exists but no restaurant is attached to it yet.
  const profile = await getProfile();
  if (!profile) redirect("/onboarding");

  return (
    <div className="flex flex-1 flex-col">
      <header className="bg-background sticky top-0 z-40 border-b">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-3 px-4">
          <Brand href="/dashboard" />
          <SignOutButton />
        </div>

        <nav className="mx-auto w-full max-w-5xl overflow-x-auto px-4">
          <ul className="flex min-w-max gap-1 pb-2 text-sm">
            {NAV.map((item) => (
              <li key={item.href}>
                {item.enabled ? (
                  <Link
                    href={item.href}
                    className="hover:bg-accent rounded-md px-3 py-1.5"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span
                    className={cn(
                      "text-muted-foreground/60 cursor-not-allowed rounded-md px-3 py-1.5"
                    )}
                    title="يُبنى في مرحلة لاحقة"
                  >
                    {item.label}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
