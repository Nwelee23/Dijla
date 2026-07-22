import { cn } from "@/lib/utils";

/** A pulsing placeholder block, used to sketch a page while it loads. */
export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("bg-muted animate-pulse rounded-md", className)}
      {...props}
    />
  );
}
