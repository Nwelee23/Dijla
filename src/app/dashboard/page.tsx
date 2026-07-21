import { redirect } from "next/navigation";

/** The board lives at its own route so staff can bookmark it directly. */
export default function DashboardPage() {
  redirect("/dashboard/orders");
}
