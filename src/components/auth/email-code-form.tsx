"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Loader2, Mail } from "lucide-react";

import { useT } from "@/components/i18n/i18n-provider";
import { OtpInput } from "@/components/auth/otp-input";
import { sendEmailOtp, verifyLoginCode } from "@/lib/auth/actions";
import { EMAIL_OTP_LENGTH } from "@/lib/auth/constants";
import { interpolate } from "@/lib/i18n";

/** Supabase `smtp_max_frequency` — one email per address per 60s. */
const RESEND_COOLDOWN_SECONDS = 60;

/**
 * Emailed-code sign-in on the river-night shell (AUTH_UI_SPEC §3.2, adapted to
 * email). Email step -> 6-box code step with a resend countdown and a way back
 * to change the address. Verifying routes by role.
 */
export function EmailCodeForm({ next }: { next?: string }) {
  const t = useT();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((n) => Math.max(0, n - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  function requestCode() {
    setError(null);
    startTransition(async () => {
      const result = await sendEmailOtp(email, { allowSignUp: false });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setStep("code");
      setCooldown(RESEND_COOLDOWN_SECONDS);
    });
  }

  function submitCode(value: string) {
    setError(null);
    startTransition(async () => {
      const result = await verifyLoginCode(email, value);
      if (!result.ok) {
        setError(result.error);
        setCode("");
        return;
      }
      router.replace(next ?? result.redirectTo);
      router.refresh();
    });
  }

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
          onComplete={submitCode}
          length={EMAIL_OTP_LENGTH}
          disabled={isPending}
        />

        {error && (
          <p className="dj-error text-center" role="alert" aria-live="polite">
            {error}
          </p>
        )}

        {isPending && (
          <p className="flex items-center justify-center gap-2 text-sm" style={{ color: "var(--dj-muted)" }}>
            <Loader2 className="size-4 animate-spin" />
            {t.auth.verifying}
          </p>
        )}

        <div className="flex flex-col items-center gap-1 text-sm">
          <button
            type="button"
            className="dj-link disabled:opacity-50"
            disabled={cooldown > 0 || isPending}
            onClick={requestCode}
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

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        requestCode();
      }}
    >
      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm" style={{ color: "var(--dj-muted)" }}>
          {t.auth.email}
        </label>
        <div className="dj-field">
          <span className="dj-field-icon">
            <Mail className="size-4" />
          </span>
          <input
            id="email"
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
        {t.auth.sendCode}
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
