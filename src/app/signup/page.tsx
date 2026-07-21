import { AuthForm } from "@/components/auth/auth-form";
import { Brand } from "@/components/layout/brand";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = {
  title: "إنشاء حساب | دجلة",
};

export default function SignupPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-4">
      <Brand />
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>أنشئ حساب مطعمك</CardTitle>
          <CardDescription>
            بدون عمولة على الطلبات — اشتراك شهري ثابت.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* After sign-up the user has no profile yet, so /dashboard sends them to onboarding. */}
          <AuthForm mode="signup" next="/onboarding" />
        </CardContent>
      </Card>
    </main>
  );
}
