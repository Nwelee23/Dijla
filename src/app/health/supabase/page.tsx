import { CheckCircle2, XCircle } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { checkSupabaseConnection } from "./actions";
import { ConnectionPanel } from "./connection-panel";

export const metadata = {
  title: "فحص الاتصال بـ Supabase | دجلة",
};

// Diagnostic page: always hit Supabase live, never serve a cached result.
export const dynamic = "force-dynamic";

export default async function SupabaseHealthPage() {
  const checks = await checkSupabaseConnection();

  return (
    <main className="mx-auto w-full max-w-2xl space-y-6 p-4 sm:p-6">
      <Card>
        <CardHeader>
          <CardTitle>فحص الاتصال بـ Supabase</CardTitle>
          <CardDescription>
            صفحة تشخيص للتطوير. الفحص يعمل بالكامل على الخادم — مفتاح{" "}
            <code className="font-mono text-xs">service_role</code> لا يصل إلى
            المتصفح أبداً.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <ul className="space-y-3">
            {checks.map((check) => (
              <li
                key={check.label}
                className="flex items-start gap-3 rounded-lg border p-3"
              >
                {check.ok ? (
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
                ) : (
                  <XCircle className="text-destructive mt-0.5 size-5 shrink-0" />
                )}
                <div className="space-y-1">
                  <p className="text-sm font-medium">{check.label}</p>
                  <p
                    className={cn(
                      "text-sm",
                      check.ok ? "text-muted-foreground" : "text-destructive"
                    )}
                  >
                    {check.detail}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          <div className="border-t pt-4">
            <p className="text-muted-foreground mb-3 text-sm">
              إعادة الفحص عبر Server Action:
            </p>
            <ConnectionPanel />
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
