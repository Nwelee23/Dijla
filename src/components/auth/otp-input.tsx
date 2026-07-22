"use client";

import { useRef } from "react";

/**
 * Six separate code boxes (AUTH_UI_SPEC §3.2): LTR, auto-advance, backspace
 * steps back, and paste fills every box at once. `autocomplete="one-time-code"`
 * on the first box lets a device offer the code for autofill.
 *
 * Controlled: the parent owns the string. `onComplete` fires once all six
 * digits are present, so the caller can submit without a button press.
 */
export function OtpInput({
  value,
  onChange,
  onComplete,
  length = 6,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  length?: number;
  disabled?: boolean;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? "");

  function set(next: string) {
    const clean = next.replace(/\D/g, "").slice(0, length);
    onChange(clean);
    if (clean.length === length) onComplete?.(clean);
  }

  function focusBox(i: number) {
    refs.current[Math.max(0, Math.min(length - 1, i))]?.focus();
  }

  function onBoxChange(i: number, raw: string) {
    const d = raw.replace(/\D/g, "");
    if (!d) return;
    // Take the last typed char so overtyping a filled box replaces it.
    const chars = value.split("");
    chars[i] = d[d.length - 1];
    const joined = chars.join("").slice(0, length);
    set(joined);
    if (i < length - 1) focusBox(i + 1);
  }

  return (
    <div className="flex justify-center gap-2" dir="ltr">
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          className="dj-otp-box"
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={1}
          value={digit}
          disabled={disabled}
          aria-label={`${i + 1}`}
          onChange={(event) => onBoxChange(i, event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Backspace" && !digits[i] && i > 0) {
              event.preventDefault();
              const chars = value.split("");
              chars[i - 1] = "";
              onChange(chars.join(""));
              focusBox(i - 1);
            }
            if (event.key === "ArrowLeft" && i > 0) focusBox(i - 1);
            if (event.key === "ArrowRight" && i < length - 1) focusBox(i + 1);
          }}
          onPaste={(event) => {
            event.preventDefault();
            const pasted = event.clipboardData.getData("text");
            set(pasted);
            const filled = pasted.replace(/\D/g, "").slice(0, length).length;
            focusBox(filled >= length ? length - 1 : filled);
          }}
        />
      ))}
    </div>
  );
}
