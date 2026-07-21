import { WifiOff } from "lucide-react";

export const metadata = {
  title: "غير متصل | دجلة",
};

/** Served by the service worker when a navigation fails. */
export default function OfflinePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <WifiOff className="text-muted-foreground size-12" />
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">لا يوجد اتصال بالإنترنت</h1>
        <p className="text-muted-foreground max-w-xs text-balance">
          تحقّق من اتصالك وحاول مرة أخرى. الطلبات التي أرسلتها سابقاً محفوظة.
        </p>
      </div>
    </main>
  );
}
