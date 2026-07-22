"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2, Lock, User } from "lucide-react";

import { useT } from "@/components/i18n/i18n-provider";
import { signInWithUsername } from "@/lib/auth/actions";

/**
 * The default auth screen: username + password (AUTH_UI_SPEC §3.1).
 *
 * The username field also accepts an email — the server action detects it — so
 * the label stays "اسم المستخدم" while existing email accounts keep working.
 * A failed sign-in never clears the username, and shows one neutral error.
 */
export function LoginForm({ next }: { next?: string }) {
  const t = useT();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await signInWithUsername(identifier, password);
      if (!result.ok) {
        setError(result.error);
        setPassword("");
        return;
      }
      router.replace(next ?? result.redirectTo);
      router.refresh();
    });
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <div className="space-y-1.5">
        <label htmlFor="identifier" className="text-sm" style={{ color: "var(--dj-muted)" }}>
          {t.auth.username}
        </label>
        <div className="dj-field">
          <span className="dj-field-icon">
            <User className="size-4" />
          </span>
          <input
            id="identifier"
            className="dj-input"
            dir="ltr"
            autoComplete="username"
            autoCapitalize="none"
            required
            placeholder={t.auth.usernamePlaceholder}
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            disabled={isPending}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="text-sm" style={{ color: "var(--dj-muted)" }}>
          {t.auth.password}
        </label>
        <div className="dj-field">
          <span className="dj-field-icon">
            <Lock className="size-4" />
          </span>
          <input
            id="password"
            className="dj-input"
            dir="ltr"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={isPending}
          />
          <button
            type="button"
            className="dj-field-trailing"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? t.auth.hidePassword : t.auth.showPassword}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm">
        <label className="flex items-center gap-2" style={{ color: "var(--dj-muted)" }}>
          <input
            type="checkbox"
            className="dj-check"
            checked={remember}
            onChange={(event) => setRemember(event.target.checked)}
          />
          {t.auth.rememberMe}
        </label>
        {/* Interim recovery: an emailed code signs you in without a password;
            the dedicated reset flow (set a new password) lands in a later task. */}
        <Link href="/login/code" className="dj-link">
          {t.auth.forgotPassword}
        </Link>
      </div>

      {error && (
        <p className="dj-error" role="alert" aria-live="polite">
          {error}
        </p>
      )}

      <button type="submit" className="dj-btn" disabled={isPending}>
        {isPending && <Loader2 className="size-4 animate-spin" />}
        {t.auth.signIn}
      </button>

      <div className="space-y-2 text-center text-sm" style={{ color: "var(--dj-muted)" }}>
        <Link href="/login/code" className="dj-link block">
          {t.auth.loginWithCode}
        </Link>
        <p>
          {t.auth.noAccount}
          <Link href="/signup" className="dj-link">
            {t.auth.goSignup}
          </Link>
        </p>
      </div>
    </form>
  );
}
