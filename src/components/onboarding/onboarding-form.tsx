"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Store } from "lucide-react";
import { toast } from "sonner";

import { createRestaurant } from "@/app/onboarding/actions";
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

/** Najaf first, then the nearby governorates the pilot is likely to reach. */
const AREAS = [
  "النجف",
  "الكوفة",
  "المشخاب",
  "المناذرة",
  "الحيرة",
  "كربلاء",
  "الديوانية",
  "بابل",
];

export function OnboardingForm() {
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
      toast.success("تم إنشاء مطعمك");
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
        <Label htmlFor="name">اسم المطعم *</Label>
        <Input
          id="name"
          required
          minLength={2}
          placeholder="مطعم دجلة"
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          disabled={isPending}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="slug">رابط المطعم</Label>
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
          <Label htmlFor="phone">رقم الهاتف</Label>
          <Input
            id="phone"
            type="tel"
            inputMode="tel"
            dir="ltr"
            placeholder="07701234567"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            disabled={isPending}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="area">المنطقة</Label>
          <Select value={area} onValueChange={setArea} disabled={isPending}>
            <SelectTrigger id="area" className="w-full">
              <SelectValue placeholder="اختر المنطقة" />
            </SelectTrigger>
            <SelectContent>
              {AREAS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="fullName">اسمك</Label>
        <Input
          id="fullName"
          placeholder="اسم صاحب المطعم"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          disabled={isPending}
        />
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      <Button type="submit" className="w-full" disabled={isPending || !name}>
        {isPending ? <Loader2 className="animate-spin" /> : <Store />}
        إنشاء المطعم
      </Button>

      <p className="text-muted-foreground text-center text-xs">
        شعار المطعم يُضاف من الإعدادات بعد تفعيل رفع الصور.
      </p>
    </form>
  );
}
