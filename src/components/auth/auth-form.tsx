"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";

import {
  sendEmailOtp,
  signInWithEmail,
  signUpWithEmail,
  verifyEmailOtp,
} from "@/lib/auth/actions";
import { EMAIL_OTP_LENGTH } from "@/lib/auth/constants";
import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Supabase `smtp_max_frequency` — one email per address per 60s. */
const RESEND_COOLDOWN_SECONDS = 60;

type Mode = "login" | "signup";
type Step = "email" | "code" | "password";

export function AuthForm({ mode, next }: { mode: Mode; next?: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((n) => Math.max(0, n - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  function done() {
    // refresh() so server components pick up the new session cookie.
    router.replace(next ?? "/dashboard");
    router.refresh();
  }

  function requestCode() {
    setError(null);
    startTransition(async () => {
      const result = await sendEmailOtp(email, { allowSignUp: mode === "signup" });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setStep("code");
      setCooldown(RESEND_COOLDOWN_SECONDS);
      toast.success("أرسلنا رمزاً إلى بريدك");
    });
  }

  function submitCode(value: string) {
    setError(null);
    startTransition(async () => {
      const result = await verifyEmailOtp(email, value);
      if (!result.ok) {
        setError("الرمز غير صحيح أو منتهي الصلاحية.");
        setCode("");
        return;
      }
      done();
    });
  }

  function submitPassword() {
    setError(null);
    startTransition(async () => {
      const result =
        mode === "signup"
          ? await signUpWithEmail(email, password)
          : await signInWithEmail(email, password);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      if (mode === "signup") {
        toast.success("تم إنشاء الحساب. تحقّق من بريدك للتأكيد.");
        return;
      }
      done();
    });
  }

  // ---- step: enter the code -------------------------------------------------
  if (step === "code") {
    return (
      <div className="space-y-5">
        <div className="space-y-1 text-center">
          <p className="text-sm">أدخل الرمز المُرسل إلى</p>
          <p className="font-medium" dir="ltr">
            {email}
          </p>
        </div>

        <div className="flex justify-center" dir="ltr">
          <InputOTP
            maxLength={EMAIL_OTP_LENGTH}
            value={code}
            onChange={(value) => {
              setCode(value);
              if (value.length === EMAIL_OTP_LENGTH) submitCode(value);
            }}
            disabled={isPending}
            autoFocus
          >
            <InputOTPGroup>
              {Array.from({ length: EMAIL_OTP_LENGTH }).map((_, i) => (
                <InputOTPSlot key={i} index={i} />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </div>

        {error && (
          <p className="text-destructive text-center text-sm">{error}</p>
        )}

        {isPending && (
          <p className="text-muted-foreground flex items-center justify-center gap-2 text-sm">
            <Loader2 className="size-4 animate-spin" />
            جارٍ التحقق…
          </p>
        )}

        <div className="flex flex-col items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            disabled={cooldown > 0 || isPending}
            onClick={requestCode}
          >
            {cooldown > 0
              ? `إعادة الإرسال بعد ${cooldown} ثانية`
              : "إعادة إرسال الرمز"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={isPending}
            onClick={() => {
              setStep("email");
              setCode("");
              setError(null);
            }}
          >
            تغيير البريد الإلكتروني
          </Button>
        </div>
      </div>
    );
  }

  // ---- step: email (+ optional password) ------------------------------------
  const usePassword = step === "password";

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (usePassword) submitPassword();
        else requestCode();
      }}
    >
      <div className="grid gap-2">
        <Label htmlFor="email">البريد الإلكتروني</Label>
        <Input
          id="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          dir="ltr"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={isPending}
        />
      </div>

      {usePassword && (
        <div className="grid gap-2">
          <Label htmlFor="password">كلمة المرور</Label>
          <Input
            id="password"
            type="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            required
            minLength={6}
            dir="ltr"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={isPending}
          />
        </div>
      )}

      {error && <p className="text-destructive text-sm">{error}</p>}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? (
          <Loader2 className="animate-spin" />
        ) : usePassword ? null : (
          <Mail />
        )}
        {usePassword
          ? mode === "signup"
            ? "إنشاء الحساب"
            : "دخول"
          : "إرسال رمز الدخول"}
      </Button>

      <div className="space-y-3 text-center text-sm">
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground underline underline-offset-4"
          onClick={() => {
            setStep(usePassword ? "email" : "password");
            setError(null);
          }}
        >
          {usePassword
            ? "الدخول برمز عبر البريد بدلاً من كلمة المرور"
            : "الدخول بكلمة المرور بدلاً من الرمز"}
        </button>

        <p className="text-muted-foreground">
          {mode === "login" ? "ليس لديك حساب؟ " : "لديك حساب بالفعل؟ "}
          <Link
            href={mode === "login" ? "/signup" : "/login"}
            className="text-foreground inline-flex items-center gap-1 underline underline-offset-4"
          >
            {mode === "login" ? "أنشئ مطعمك" : "تسجيل الدخول"}
            <ArrowRight className="size-3 rtl:rotate-180" />
          </Link>
        </p>
      </div>
    </form>
  );
}
