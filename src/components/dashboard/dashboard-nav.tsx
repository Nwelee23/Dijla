"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NAV_ITEMS, type NavItem } from "./nav-items";
import { cn } from "@/lib/utils";

function useIsActive(href: string) {
  const pathname = usePathname();
  // "/dashboard" must not light up on every child route.
  return href === "/dashboard" ? pathname === href : pathname.startsWith(href);
}

function NavLink({ item, className }: { item: NavItem; className?: string }) {
  const isActive = useIsActive(item.href);
  const Icon = item.icon;

  const shared = cn(
    "flex items-center gap-2 rounded-md px-3 py-2 text-sm whitespace-nowrap transition-colors",
    className
  );

  if (!item.enabled) {
    return (
      <span
        aria-disabled
        title={`يُبنى في ${item.phase}`}
        className={cn(shared, "text-muted-foreground/50 cursor-not-allowed")}
      >
        <Icon className="size-4 shrink-0" />
        {item.label}
      </span>
    );
  }

  return (
    <Link
      href={item.href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        shared,
        isActive
          ? "bg-primary/10 text-primary font-medium"
          : "hover:bg-accent text-foreground"
      )}
    >
      <Icon className="size-4 shrink-0" />
      {item.label}
    </Link>
  );
}

/** Fixed sidebar, md and up. */
export function DashboardSidebar() {
  return (
    <nav className="hidden w-52 shrink-0 border-s p-3 md:block">
      <ul className="space-y-1">
        {NAV_ITEMS.map((item) => (
          <li key={item.href}>
            <NavLink item={item} className="w-full" />
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * Mobile nav: a horizontally scrolling strip. Six items is too many for a
 * bottom bar, and restaurant staff work on phones far more than desktops.
 */
export function DashboardMobileNav() {
  return (
    <nav className="overflow-x-auto border-b md:hidden">
      <ul className="flex min-w-max gap-1 px-2 py-2">
        {NAV_ITEMS.map((item) => (
          <li key={item.href}>
            <NavLink item={item} />
          </li>
        ))}
      </ul>
    </nav>
  );
}
