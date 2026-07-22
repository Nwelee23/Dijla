"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, KeyRound, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";

import { useT } from "@/components/i18n/i18n-provider";
import { OtpInput } from "@/components/auth/otp-input";
import { PasswordField } from "@/components/auth/password-field";
import { requestPasswordReset, resetPassword } from "@/lib/auth/actions";
import { EMAIL_OTP_LENGTH } from "@/lib/auth/constants";
import { interpolate } from "@/lib/i18n";

const RESEND_COOLDOWN_SECONDS = 60;

/**
 * Account recovery (AUTH_UI_SPEC §3.3): email -> code -> new password. The code
 * is collected but not verified on its own — a one-time code is single-use, so
 * it is verified together with the new password in resetPassword, which also
 * signs out every other session.
 */
export function ForgotPasswordForm() {
  const t = useT();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [step, setStep] = useState<"email" | "code" | "password">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((n) => Math.max(0, n - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  function sendCode() {
    setError(null);
    startTransition(async () => {
      const result = await requestPasswordReset(email);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      // Neutral: we never say whether the account exists (§7).
      toast.success(t.auth.resetSent);
      setStep("code");
      setCooldown(RESEND_COOLDOWN_SECONDS);
    });
  }

  function submitNewPassword() {
    setError(null);
    startTransition(async () => {
      const result = await resetPassword(email, code, password);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(t.auth.resetDone);
      router.replace(result.redirectTo);
      router.refresh();
    });
  }

  // ---- step: set the new password ------------------------------------------
  if (step === "password") {
    return (
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          submitNewPassword();
        }}
      >
        <PasswordField
          value={password}
          onChange={setPassword}
          label={t.auth.newPassword}
          autoComplete="new-password"
          showStrength
          disabled={isPending}
        />

        {error && (
          <p className="dj-error" role="alert" aria-live="polite">
            {error}
          </p>
        )}

        <button type="submit" className="dj-btn" disabled={isPending}>
          {isPending ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
          {t.auth.setNewPassword}
        </button>

        <button
          type="button"
          className="block w-full text-center text-sm"
          style={{ color: "var(--dj-muted)" }}
          disabled={isPending}
          onClick={() => {
            setStep("code");
            setError(null);
          }}
        >
          {t.auth.changeCode}
        </button>
      </form>
    );
  }

  // ---- step: enter the code ------------------------------------------------
  if (step === "code") {
    return (
      <div className="space-y-5">
        <div className="space-y-1 text-center text-sm" style={{ color: "var(--dj-muted)" }}>
          <p>{t.auth.enterCodeFor}</p>
          <p className="font-medium" dir="ltr" style={{ color: "var(--dj-fg)" }}>
            {email}
          </p>
        </div>

        <OtpInput
          value={code}
          onChange={setCode}
          onComplete={() => {
            setError(null);
            setStep("password");
          }}
          length={EMAIL_OTP_LENGTH}
          disabled={isPending}
        />

        <div className="flex flex-col items-center gap-1 text-sm">
          <button
            type="button"
            className="dj-link disabled:opacity-50"
            disabled={cooldown > 0 || isPending}
            onClick={sendCode}
            aria-live="polite"
          >
            {cooldown > 0
              ? interpolate(t.auth.resendIn, { seconds: cooldown })
              : t.auth.resend}
          </button>
          <button
            type="button"
            style={{ color: "var(--dj-muted)" }}
            disabled={isPending}
            onClick={() => {
              setStep("email");
              setCode("");
              setError(null);
            }}
          >
            {t.auth.changeEmail}
          </button>
        </div>
      </div>
    );
  }

  // ---- step: email ---------------------------------------------------------
  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        sendCode();
      }}
    >
      <p className="dj-glass p-3 text-xs" style={{ color: "var(--dj-muted)", borderRadius: "12px" }}>
        {t.auth.forgotNote}
      </p>

      <div className="space-y-1.5">
        <label htmlFor="reset-email" className="text-sm" style={{ color: "var(--dj-muted)" }}>
          {t.auth.email}
        </label>
        <div className="dj-field">
          <span className="dj-field-icon">
            <Mail className="size-4" />
          </span>
          <input
            id="reset-email"
            className="dj-input"
            dir="ltr"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={isPending}
          />
        </div>
      </div>

      {error && (
        <p className="dj-error" role="alert" aria-live="polite">
          {error}
        </p>
      )}

      <button type="submit" className="dj-btn" disabled={isPending}>
        {isPending ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
        {t.auth.sendResetCode}
      </button>

      <p className="text-center text-sm">
        <Link href="/login" className="dj-link inline-flex items-center gap-1">
          {t.auth.backToPassword}
          <ArrowRight className="size-3 rtl:rotate-180" />
        </Link>
      </p>
    </form>
  );
}
