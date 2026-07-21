import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a money amount for display. Currency defaults to IQD (see AGENTS.md).
 *
 * Latin digits, deliberately. Plain `ar-IQ` renders Arabic-Indic numerals
 * (١٥٬٠٠٠), but Iraqi price tags, receipts and menus use Western digits, and
 * everything else in this app already does — order numbers, quantities, table
 * numbers, the price field the owner types into. Leaving the locale default
 * meant an owner entered 15000 and their customer read ١٥٬٠٠٠.
 */
export function formatMoney(amount: number, currency = "IQD") {
  return `${new Intl.NumberFormat("ar-IQ-u-nu-latn").format(amount)} ${currency}`
}
