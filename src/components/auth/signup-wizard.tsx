"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  CircleCheck,
  FileUp,
  Loader2,
  Mail,
  User,
} from "lucide-react";
import { toast } from "sonner";

import { useT } from "@/components/i18n/i18n-provider";
import { OtpInput } from "@/components/auth/otp-input";
import { PasswordField } from "@/components/auth/password-field";
import { LocationPicker, type Pin } from "@/components/customer/location-picker";
import {
  checkUsernameAvailable,
  sendEmailOtp,
  verifyEmailOtp,
} from "@/lib/auth/actions";
import { EMAIL_OTP_LENGTH } from "@/lib/auth/constants";
import {
  isValidUsername,
  normalizeUsername,
  suggestUsername,
} from "@/lib/auth/username";
import { completeSignup, setVerificationDocs } from "@/app/signup/actions";
import { areaOptions } from "@/lib/areas";
import { compressImage, MAX_UPLOAD_BYTES } from "@/lib/image";
import { interpolate } from "@/lib/i18n";
import { restaurantTypeOptions } from "@/lib/restaurant-types";
import { createClient } from "@/lib/supabase/client";

const STORAGE_KEY = "dijla_signup";
const RESEND_COOLDOWN_SECONDS = 60;
const DOC_TYPES = "image/jpeg,image/png,image/webp,application/pdf";

type Persisted = {
  step: number;
  ownerName: string;
  ownerPhone: string;
  email: string;
  emailVerified: boolean;
  username: string;
  restaurantName: string;
  restaurantType: string;
  restaurantPhone: string;
  area: string;
  district: string;
  landmark: string;
  pin: Pin | null;
};

type UsernameStatus = "idle" | "checking" | "ok" | "taken" | "invalid";

/** Uploads one document to the private bucket, compressing images first. */
async function uploadDoc(restaurantId: string, file: File, kind: string) {
  let toUpload = file;
  if (file.type.startsWith("image/")) {
    try {
      toUpload = await compressImage(file);
    } catch {
      // Not a compressible image (or decode failed) — send the original.
    }
  }
  if (toUpload.size > MAX_UPLOAD_BYTES) throw new Error("too_large");

  const ext = (toUpload.name.split(".").pop() || "bin").toLowerCase();
  const path = `${restaurantId}/${kind}-${crypto.randomUUID()}.${ext}`;
  const supabase = createClient();
  const { error } = await supabase.storage
    .from("verification-docs")
    .upload(path, toUpload, { contentType: toUpload.type, upsert: false });
  if (error) throw error;
  return path;
}

/**
 * The 3-step signup wizard (AUTH_UI_SPEC §3.4, §4). Account -> restaurant ->
 * review+documents. Text progress persists to localStorage so a dropped signup
 * resumes where it left off; the password, code and files are held in memory
 * only, never persisted.
 */
export function SignupWizard() {
  const t = useT();
  const router = useRouter();

  const [step, setStep] = useState(1);
  // account
  const [ownerName, setOwnerName] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [code, setCode] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [username, setUsername] = useState("");
  const [checked, setChecked] = useState<{ name: string; available: boolean } | null>(null);
  const [password, setPassword] = useState("");
  // restaurant
  const [restaurantName, setRestaurantName] = useState("");
  const [restaurantType, setRestaurantType] = useState("");
  const [restaurantPhone, setRestaurantPhone] = useState("");
  const [area, setArea] = useState("najaf");
  const [district, setDistrict] = useState("");
  const [landmark, setLandmark] = useState("");
  const [pin, setPin] = useState<Pin | null>(null);
  // documents
  const [idDoc, setIdDoc] = useState<File | null>(null);
  const [license, setLicense] = useState<File | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);
  const restored = useRef(false);

  // ---- restore / persist ----------------------------------------------------
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect --
       One-time restore of persisted progress on mount. Reading localStorage in a
       lazy useState initializer would desync SSR and hydrate the controlled
       inputs with a mismatch; this runs once, so there is no cascading render. */
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const s = JSON.parse(raw) as Partial<Persisted>;
        setStep(s.step ?? 1);
        setOwnerName(s.ownerName ?? "");
        setOwnerPhone(s.ownerPhone ?? "");
        setEmail(s.email ?? "");
        setEmailVerified(!!s.emailVerified);
        setUsername(s.username ?? "");
        setRestaurantName(s.restaurantName ?? "");
        setRestaurantType(s.restaurantType ?? "");
        setRestaurantPhone(s.restaurantPhone ?? "");
        setArea(s.area ?? "najaf");
        setDistrict(s.district ?? "");
        setLandmark(s.landmark ?? "");
        setPin(s.pin ?? null);
      }
    } catch {
      // Ignore corrupt storage — start fresh.
    }
    restored.current = true;
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (!restored.current) return;
    const data: Persisted = {
      step, ownerName, ownerPhone, email, emailVerified, username,
      restaurantName, restaurantType, restaurantPhone, area, district, landmark, pin,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Storage full or blocked — persistence is best-effort.
    }
  }, [step, ownerName, ownerPhone, email, emailVerified, username, restaurantName, restaurantType, restaurantPhone, area, district, landmark, pin]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((n) => Math.max(0, n - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  // ---- live username availability (debounced) ------------------------------
  // Only the async result is stored; idle/invalid/checking are derived below, so
  // the effect never calls setState synchronously in its body.
  useEffect(() => {
    const u = normalizeUsername(username);
    if (!u || !isValidUsername(u)) return;
    const timer = setTimeout(async () => {
      const result = await checkUsernameAvailable(u);
      setChecked({ name: u, available: result.valid && result.available });
    }, 400);
    return () => clearTimeout(timer);
  }, [username]);

  const normUsername = normalizeUsername(username);
  const usernameStatus: UsernameStatus = !normUsername
    ? "idle"
    : !isValidUsername(normUsername)
      ? "invalid"
      : checked?.name === normUsername
        ? checked.available
          ? "ok"
          : "taken"
        : "checking";

  function sendCode() {
    setError(null);
    startTransition(async () => {
      const result = await sendEmailOtp(email, { allowSignUp: true });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setEmailSent(true);
      setCooldown(RESEND_COOLDOWN_SECONDS);
    });
  }

  function verifyCode(value: string) {
    setError(null);
    startTransition(async () => {
      const result = await verifyEmailOtp(email, value);
      if (!result.ok) {
        setError(t.auth.invalidCode);
        setCode("");
        return;
      }
      setEmailVerified(true);
      // Seed a username suggestion once we know the restaurant name later; for
      // now, if the restaurant name is already filled (resumed), suggest.
      if (!username && restaurantName) {
        setUsername(suggestUsername(restaurantName, area));
      }
    });
  }

  function submit() {
    setError(null);
    setSubmitting(true);
    startTransition(async () => {
      const result = await completeSignup({
        ownerName, ownerPhone, username, password,
        restaurantName, restaurantType, restaurantPhone,
        area, district, landmark,
        lat: pin?.lat ?? null, lng: pin?.lng ?? null,
      });
      if (!result.ok) {
        setError(result.error);
        setSubmitting(false);
        return;
      }

      // Documents upload after the restaurant (and its folder) exist.
      try {
        const idPath = idDoc ? await uploadDoc(result.restaurantId, idDoc, "id") : null;
        const licensePath = license ? await uploadDoc(result.restaurantId, license, "license") : null;
        if (idPath) await setVerificationDocs(idPath, licensePath);
      } catch {
        // The account exists; a failed document upload is recoverable later.
        toast.error(t.signup.docUploadFailed);
      }

      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
      toast.success(t.signup.createdPending);
      router.replace("/dashboard");
      router.refresh();
    });
  }

  const usernameOk = usernameStatus === "ok";
  const accountReady = emailVerified && usernameOk && password.length >= 8 && ownerName.trim().length >= 2;
  const restaurantReady =
    restaurantName.trim().length >= 2 && !!restaurantType && district.trim() && landmark.trim() && !!pin;

  return (
    <div className="space-y-5">
      <ProgressBar step={step} label={interpolate(t.signup.stepLabel, { n: step })} />

      {step === 1 && (
        <div className="space-y-4">
          <Field label={t.signup.ownerName} icon={<User className="size-4" />}>
            <input
              className="dj-input"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder={t.signup.ownerNamePlaceholder}
              disabled={isPending}
            />
          </Field>

          <Field label={`${t.common.phone} · ${t.signup.optional}`}>
            <input
              className="dj-input" dir="ltr" type="tel" inputMode="tel"
              value={ownerPhone}
              onChange={(e) => setOwnerPhone(e.target.value)}
              placeholder={t.common.phonePlaceholder}
              disabled={isPending}
            />
          </Field>

          {!emailVerified ? (
            <>
              <Field label={t.auth.email} icon={<Mail className="size-4" />}>
                <input
                  className="dj-input" dir="ltr" type="email" inputMode="email" autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  disabled={isPending || emailSent}
                />
              </Field>

              {!emailSent ? (
                <button type="button" className="dj-btn" onClick={sendCode} disabled={isPending || !email}>
                  {isPending ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
                  {t.auth.sendCode}
                </button>
              ) : (
                <div className="space-y-3">
                  <p className="text-center text-sm" style={{ color: "var(--dj-muted)" }}>
                    {t.auth.enterCodeFor} <span dir="ltr">{email}</span>
                  </p>
                  <OtpInput value={code} onChange={setCode} onComplete={verifyCode} length={EMAIL_OTP_LENGTH} disabled={isPending} />
                  <div className="flex justify-center">
                    <button
                      type="button" className="dj-link text-sm disabled:opacity-50"
                      disabled={cooldown > 0 || isPending} onClick={sendCode}
                    >
                      {cooldown > 0 ? interpolate(t.auth.resendIn, { seconds: cooldown }) : t.auth.resend}
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <p className="flex items-center gap-2 text-sm" style={{ color: "var(--dj-success)" }}>
                <CircleCheck className="size-4" />
                {t.signup.emailVerified} <span dir="ltr">{email}</span>
              </p>

              <div className="space-y-1.5">
                <label className="text-sm" style={{ color: "var(--dj-muted)" }}>{t.auth.username}</label>
                <div className="dj-field">
                  <span className="dj-field-icon"><User className="size-4" /></span>
                  <input
                    className="dj-input" dir="ltr" autoCapitalize="none"
                    value={username}
                    onChange={(e) => setUsername(normalizeUsername(e.target.value))}
                    placeholder="alfurat_najaf"
                    disabled={isPending}
                  />
                </div>
                <UsernameHint status={usernameStatus} />
              </div>

              <PasswordField
                value={password}
                onChange={setPassword}
                label={t.auth.password}
                autoComplete="new-password"
                showStrength
                disabled={isPending}
              />
            </>
          )}

          {error && <p className="dj-error" role="alert">{error}</p>}

          <StepNav
            onNext={() => { setError(null); setStep(2); }}
            nextDisabled={!accountReady}
            nextLabel={t.signup.next}
          />
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <Field label={t.signup.restaurantName}>
            <input
              className="dj-input"
              value={restaurantName}
              onChange={(e) => {
                setRestaurantName(e.target.value);
                if (!username && emailVerified) setUsername(suggestUsername(e.target.value, area));
              }}
              placeholder={t.onboarding.restaurantNamePlaceholder}
              disabled={isPending}
            />
          </Field>

          <div className="space-y-1.5">
            <label className="text-sm" style={{ color: "var(--dj-muted)" }}>{t.signup.restaurantType}</label>
            <div className="grid grid-cols-2 gap-2">
              {restaurantTypeOptions(t).map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setRestaurantType(option.key)}
                  className="rounded-xl border p-2 text-sm"
                  style={{
                    borderColor: restaurantType === option.key ? "var(--dj-cta)" : "var(--dj-line)",
                    background: restaurantType === option.key ? "rgba(46,211,183,.12)" : "var(--dj-glass)",
                    color: "var(--dj-fg)",
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <Field label={`${t.signup.restaurantPhone} · ${t.signup.optional}`}>
            <input
              className="dj-input" dir="ltr" type="tel" inputMode="tel"
              value={restaurantPhone}
              onChange={(e) => setRestaurantPhone(e.target.value)}
              placeholder={t.common.phonePlaceholder}
              disabled={isPending}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label={t.common.area}>
              <select
                className="dj-input" style={{ paddingInline: "12px" }}
                value={area}
                onChange={(e) => setArea(e.target.value)}
                disabled={isPending}
              >
                {areaOptions(t).map((option) => (
                  <option key={option.key} value={option.key} style={{ color: "#06333a" }}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t.signup.district}>
              <input
                className="dj-input"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder={t.signup.districtPlaceholder}
                disabled={isPending}
              />
            </Field>
          </div>

          <Field label={t.signup.landmark}>
            <input
              className="dj-input"
              value={landmark}
              onChange={(e) => setLandmark(e.target.value)}
              placeholder={t.signup.landmarkPlaceholder}
              disabled={isPending}
            />
          </Field>

          <div className="space-y-1.5">
            <label className="text-sm" style={{ color: "var(--dj-muted)" }}>{t.signup.pinLabel}</label>
            <LocationPicker value={pin} onChange={setPin} />
          </div>

          {error && <p className="dj-error" role="alert">{error}</p>}

          <StepNav
            onBack={() => { setError(null); setStep(1); }}
            backLabel={t.signup.back}
            onNext={() => { setError(null); setStep(3); }}
            nextDisabled={!restaurantReady}
            nextLabel={t.signup.next}
          />
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div className="space-y-1">
            <h2 className="font-semibold">{t.signup.reviewTitle}</h2>
            <p className="text-xs" style={{ color: "var(--dj-muted)" }}>{t.signup.reviewHint}</p>
          </div>

          <dl className="dj-glass space-y-1.5 p-3 text-sm" style={{ borderRadius: "12px" }}>
            <Row label={t.signup.restaurantName} value={restaurantName} />
            <Row label={t.signup.restaurantType} value={restaurantTypeOptions(t).find((o) => o.key === restaurantType)?.label ?? ""} />
            <Row label={t.common.area} value={areaOptions(t).find((o) => o.key === area)?.label ?? area} />
            <Row label={t.signup.district} value={district} />
            <Row label={t.signup.landmark} value={landmark} />
            <Row label={t.auth.username} value={username} ltr />
          </dl>

          <DocPicker
            label={t.signup.idDocument}
            hint={t.signup.idDocumentHint}
            file={idDoc}
            onPick={setIdDoc}
            disabled={submitting}
          />
          <DocPicker
            label={`${t.signup.licenseDocument} · ${t.signup.optional}`}
            hint={t.signup.licenseHint}
            file={license}
            onPick={setLicense}
            disabled={submitting}
          />

          <p className="text-xs" style={{ color: "var(--dj-muted)" }}>{t.signup.reviewFooter}</p>

          {error && <p className="dj-error" role="alert">{error}</p>}

          <StepNav
            onBack={() => { setError(null); setStep(2); }}
            backLabel={t.signup.back}
            onNext={submit}
            nextDisabled={!idDoc || submitting}
            nextLabel={submitting ? t.signup.submitting : t.signup.submit}
            nextLoading={submitting}
          />
        </div>
      )}

      <p className="text-center text-sm" style={{ color: "var(--dj-muted)" }}>
        {t.auth.haveAccount}
        <Link href="/login" className="dj-link">{t.auth.goLogin}</Link>
      </p>
    </div>
  );
}

// ---- small presentational helpers ------------------------------------------

function ProgressBar({ step, label }: { step: number; label: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex gap-1.5">
        {[1, 2, 3].map((i) => (
          <span
            key={i}
            className="h-1.5 flex-1 rounded-full"
            style={{ background: i <= step ? "var(--dj-cta)" : "rgba(255,255,255,.2)" }}
          />
        ))}
      </div>
      <p className="text-xs" style={{ color: "var(--dj-muted)" }}>{label}</p>
    </div>
  );
}

function Field({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm" style={{ color: "var(--dj-muted)" }}>{label}</label>
      {icon ? (
        <div className="dj-field">
          <span className="dj-field-icon">{icon}</span>
          {children}
        </div>
      ) : (
        children
      )}
    </div>
  );
}

function UsernameHint({ status }: { status: UsernameStatus }) {
  const t = useT();
  if (status === "idle") return null;
  const map = {
    checking: { text: t.signup.usernameChecking, color: "var(--dj-muted)" },
    ok: { text: t.signup.usernameAvailable, color: "var(--dj-success)" },
    taken: { text: t.signup.usernameTaken, color: "var(--dj-danger)" },
    invalid: { text: t.signup.usernameInvalid, color: "var(--dj-danger)" },
  }[status];
  return (
    <p className="flex items-center gap-1 text-xs" style={{ color: map.color }} aria-live="polite">
      {status === "checking" ? <Loader2 className="size-3 animate-spin" /> : status === "ok" ? <Check className="size-3" /> : null}
      {map.text}
    </p>
  );
}

function DocPicker({
  label, hint, file, onPick, disabled,
}: {
  label: string; hint: string; file: File | null; onPick: (f: File | null) => void; disabled?: boolean;
}) {
  const t = useT();
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-1.5">
      <label className="text-sm" style={{ color: "var(--dj-muted)" }}>{label}</label>
      <input
        ref={ref}
        type="file"
        accept={DOC_TYPES}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f && f.size > MAX_UPLOAD_BYTES) {
            toast.error(t.signup.docTooLarge);
            return;
          }
          onPick(f ?? null);
        }}
      />
      <button
        type="button"
        className="flex w-full items-center gap-2 rounded-xl border p-3 text-sm"
        style={{ borderColor: file ? "var(--dj-success)" : "var(--dj-line)", background: "var(--dj-glass)", color: "var(--dj-fg)" }}
        onClick={() => ref.current?.click()}
        disabled={disabled}
      >
        {file ? <CircleCheck className="size-4" style={{ color: "var(--dj-success)" }} /> : <FileUp className="size-4" style={{ color: "var(--dj-muted)" }} />}
        <span className="truncate">{file ? file.name : hint}</span>
      </button>
    </div>
  );
}

function Row({ label, value, ltr }: { label: string; value: string; ltr?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt style={{ color: "var(--dj-muted)" }}>{label}</dt>
      <dd className="truncate font-medium" dir={ltr ? "ltr" : undefined}>{value}</dd>
    </div>
  );
}

function StepNav({
  onBack, backLabel, onNext, nextDisabled, nextLabel, nextLoading,
}: {
  onBack?: () => void; backLabel?: string; onNext: () => void; nextDisabled?: boolean; nextLabel: string; nextLoading?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      {onBack && (
        <button type="button" className="rounded-xl border px-4 py-2.5 text-sm" style={{ borderColor: "var(--dj-line)", color: "var(--dj-fg)" }} onClick={onBack}>
          {backLabel}
        </button>
      )}
      <button type="button" className="dj-btn flex-1" onClick={onNext} disabled={nextDisabled}>
        {nextLoading ? <Loader2 className="size-4 animate-spin" /> : null}
        {nextLabel}
        {!nextLoading && <ArrowRight className="size-4 rtl:rotate-180" />}
      </button>
    </div>
  );
}
