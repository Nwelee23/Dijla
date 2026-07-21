import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format a money amount for display. Currency defaults to IQD (see AGENTS.md). */
export function formatMoney(amount: number, currency = "IQD") {
  return `${new Intl.NumberFormat("ar-IQ").format(amount)} ${currency}`
}
