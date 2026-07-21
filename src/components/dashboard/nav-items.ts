import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bike,
  ClipboardList,
  QrCode,
  Settings,
  UtensilsCrossed,
} from "lucide-react";

import type { Dictionary } from "@/lib/i18n";

export type NavItem = {
  href: string;
  /** Key into `t.nav` — the label itself lives in the dictionaries. */
  label: keyof Dictionary["nav"];
  icon: LucideIcon;
  /** Flip to true when the phase that builds the screen lands. */
  enabled: boolean;
  /** Key into `t.phases`, shown in the tooltip while disabled. */
  phase: keyof Dictionary["phases"];
};

export const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "orders",
    icon: ClipboardList,
    enabled: true,
    phase: "phase2",
  },
  {
    href: "/dashboard/menu",
    label: "menu",
    icon: UtensilsCrossed,
    enabled: true,
    phase: "task15",
  },
  {
    href: "/dashboard/tables",
    label: "tables",
    icon: QrCode,
    enabled: false,
    phase: "phase2",
  },
  {
    href: "/dashboard/drivers",
    label: "drivers",
    icon: Bike,
    enabled: false,
    phase: "phase4",
  },
  {
    href: "/dashboard/reports",
    label: "reports",
    icon: BarChart3,
    enabled: false,
    phase: "phase5",
  },
  {
    href: "/dashboard/settings",
    label: "settings",
    icon: Settings,
    enabled: true,
    phase: "task17",
  },
];
