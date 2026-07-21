import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bike,
  ClipboardList,
  QrCode,
  Settings,
  UtensilsCrossed,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Flip to true when the phase that builds the screen lands. */
  enabled: boolean;
  /** Shown in the tooltip while disabled. */
  phase: string;
};

export const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "الطلبات",
    icon: ClipboardList,
    enabled: true,
    phase: "المرحلة 2",
  },
  {
    href: "/dashboard/menu",
    label: "القائمة",
    icon: UtensilsCrossed,
    enabled: false,
    phase: "المهمة 1.5",
  },
  {
    href: "/dashboard/tables",
    label: "الطاولات",
    icon: QrCode,
    enabled: false,
    phase: "المرحلة 2",
  },
  {
    href: "/dashboard/drivers",
    label: "السائقون",
    icon: Bike,
    enabled: false,
    phase: "المرحلة 4",
  },
  {
    href: "/dashboard/reports",
    label: "التقارير",
    icon: BarChart3,
    enabled: false,
    phase: "المرحلة 5",
  },
  {
    href: "/dashboard/settings",
    label: "الإعدادات",
    icon: Settings,
    enabled: false,
    phase: "المهمة 1.7",
  },
];
