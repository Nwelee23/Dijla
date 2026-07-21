"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Store } from "lucide-react";
import { toast } from "sonner";

import { createRestaurant } from "@/app/onboarding/actions";
import { useT } from "@/components/i18n/i18n-provider";
import { areaOptions } from "@/lib/areas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { slugify } from "@/lib/slug";

export function OnboardingForm() {
  const t = useT();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [phone, setPhone] = useState("");
  const [area, setArea] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);

  // The slug follows the name until the owner edits it themselves.
  function onNameChange(value: string) {
    setName(value);
    if (!slugEdited) setSlug(slugify(value));
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await createRestaurant({ name, slug, phone, area, fullName });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(t.onboarding.created);
      router.replace("/dashboard");
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
        <Label htmlFor="name">{t.onboarding.restaurantName} *</Label>
        <Input
          id="name"
          required
          minLength={2}
          placeholder={t.onboarding.restaurantNamePlaceholder}
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          disabled={isPending}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="slug">{t.onboarding.slug}</Label>
        <Input
          id="slug"
          dir="ltr"
          placeholder="mtam-djla"
          value={slug}
          onChange={(event) => {
            setSlugEdited(true);
            setSlug(event.target.value);
          }}
          disabled={isPending}
        />
        <p className="text-muted-foreground text-xs" dir="ltr">
          /r/{slug || "…"}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="phone">{t.common.phone}</Label>
          <Input
            id="phone"
            type="tel"
            inputMode="tel"
            dir="ltr"
            placeholder={t.common.phonePlaceholder}
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            disabled={isPending}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="area">{t.common.area}</Label>
          <Select value={area} onValueChange={setArea} disabled={isPending}>
            <SelectTrigger id="area" className="w-full">
              <SelectValue placeholder={t.common.selectArea} />
            </SelectTrigger>
            <SelectContent>
              {areaOptions(t).map((option) => (
                <SelectItem key={option.key} value={option.key}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="fullName">{t.onboarding.yourName}</Label>
        <Input
          id="fullName"
          placeholder={t.onboarding.yourNamePlaceholder}
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          disabled={isPending}
        />
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      <Button type="submit" className="w-full" disabled={isPending || !name}>
        {isPending ? <Loader2 className="animate-spin" /> : <Store />}
        {t.onboarding.submit}
      </Button>

      <p className="text-muted-foreground text-center text-xs">
        {t.onboarding.logoLater}
      </p>
    </form>
  );
}
