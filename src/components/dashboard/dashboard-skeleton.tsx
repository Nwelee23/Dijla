import { Skeleton } from "@/components/ui/skeleton";

/**
 * The shape of a dashboard page while its data loads.
 *
 * Rendered by each route's loading.tsx, so navigating between screens shows
 * this at once instead of a frozen page — the server component streams in
 * behind it. It only has to read as "loading", so one generic layout (a title,
 * a row of cards, a list) stands in for every screen.
 */
export function DashboardSkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-64 max-w-full" />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>

      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
