"use client";

import { useId, useState } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";

import { useT } from "@/components/i18n/i18n-provider";
import { passwordStrength, strengthKey } from "@/lib/auth/password";

const BAR_COLOR: Record<string, string> = {
  weak: "var(--dj-danger)",
  fair: "var(--dj-warning)",
  good: "var(--dj-success)",
  strong: "var(--dj-cta)",
};

/**
 * Password input on the glass shell: leading lock, show/hide eye, and an
 * optional 4-segment strength meter (AUTH_UI_SPEC §5). Typing on a phone is
 * hard, so show/hide is always available. Reused by signup and password reset.
 */
export function PasswordField({
  value,
  onChange,
  label,
  autoComplete = "new-password",
  showStrength = false,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  autoComplete?: string;
  showStrength?: boolean;
  disabled?: boolean;
}) {
  const t = useT();
  const id = useId();
  const [show, setShow] = useState(false);

  const { score } = passwordStrength(value);
  const key = strengthKey(score);
  const label2 = { weak: t.auth.pwWeak, fair: t.auth.pwFair, good: t.auth.pwGood, strong: t.auth.pwStrong }[key];

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm" style={{ color: "var(--dj-muted)" }}>
        {label}
      </label>
      <div className="dj-field">
        <span className="dj-field-icon">
          <Lock className="size-4" />
        </span>
        <input
          id={id}
          className="dj-input"
          dir="ltr"
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          required
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
        />
        <button
          type="button"
          className="dj-field-trailing"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? t.auth.hidePassword : t.auth.showPassword}
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>

      {showStrength && value.length > 0 && (
        <div className="space-y-1">
          <div className="flex gap-1" aria-hidden>
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className="h-1 flex-1 rounded-full"
                style={{
                  background: i < score ? BAR_COLOR[key] : "var(--dj-line)",
                }}
              />
            ))}
          </div>
          <p className="text-xs" style={{ color: "var(--dj-muted)" }} aria-live="polite">
            {label2}
          </p>
        </div>
      )}
    </div>
  );
}
