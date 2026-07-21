"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogIn } from "lucide-react";

import { signInDriver } from "@/app/driver/actions";
import { useT } from "@/components/i18n/i18n-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DriverLoginForm() {
  const t = useT();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await signInDriver(phone, code);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      // refresh() so the driver layout re-reads the new session cookie.
      router.replace("/driver");
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
      <div className="grid gap-2">
        <Label htmlFor="driver-phone">{t.common.phone}</Label>
        <Input
          id="driver-phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          dir="ltr"
          required
          placeholder={t.common.phonePlaceholder}
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          disabled={isPending}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="driver-code">{t.driverAuth.code}</Label>
        <Input
          id="driver-code"
          // The code is uppercase letters and digits; keep the caps and the
          // font monospaced so an O reads apart from a 0 while typing.
          className="font-mono tracking-widest uppercase"
          autoComplete="one-time-code"
          autoCapitalize="characters"
          dir="ltr"
          required
          placeholder={t.driverAuth.codePlaceholder}
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          disabled={isPending}
        />
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      <Button type="submit" className="h-12 w-full text-base" disabled={isPending}>
        {isPending ? <Loader2 className="animate-spin" /> : <LogIn />}
        {t.driverAuth.signIn}
      </Button>
    </form>
  );
}
