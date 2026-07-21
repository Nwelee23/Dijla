import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = {
  title: "تسجيل الدخول | دجلة",
};

/**
 * Placeholder. The real phone-OTP / email form is task 1.1; the auth actions it
 * will call already exist in `lib/auth/actions.ts`.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>تسجيل الدخول</CardTitle>
          <CardDescription>
            صفحة الدخول تُبنى في المهمة 1.1 (رمز عبر الهاتف + بريد إلكتروني).
          </CardDescription>
        </CardHeader>
        {next && (
          <CardContent>
            <p className="text-muted-foreground text-sm">
              بعد الدخول ستُعاد إلى:{" "}
              <code className="font-mono text-xs">{next}</code>
            </p>
          </CardContent>
        )}
      </Card>
    </main>
  );
}
