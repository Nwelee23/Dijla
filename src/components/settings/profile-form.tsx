"use client";

import { useState, useTransition } from "react";
import { Loader2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { updateRestaurantProfile } from "@/app/dashboard/settings/actions";
import { ImageUpload } from "@/components/shared/image-upload";
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
import { formatIraqiPhone } from "@/lib/auth/phone";
import type { Restaurant } from "@/lib/restaurant";

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

export function ProfileForm({ restaurant }: { restaurant: Restaurant }) {
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState(restaurant.name);
  const [slug, setSlug] = useState(restaurant.slug);
  const [phone, setPhone] = useState(
    restaurant.phone ? formatIraqiPhone(restaurant.phone) : ""
  );
  const [area, setArea] = useState(restaurant.area ?? "");
  const [logoUrl, setLogoUrl] = useState<string | null>(restaurant.logo_url);
  const [deliveryFee, setDeliveryFee] = useState(
    String(restaurant.delivery_fee ?? 0)
  );

  const slugChanged = slug !== restaurant.slug;

  function submit() {
    startTransition(async () => {
      const result = await updateRestaurantProfile({
        name,
        slug,
        phone,
        area,
        logoUrl,
        deliveryFee: Number(deliveryFee),
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("تم حفظ الإعدادات");
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
        <Label>شعار المطعم</Label>
        <ImageUpload
          value={logoUrl}
          onChange={setLogoUrl}
          restaurantId={restaurant.id}
          label="شعار"
          aspect="square"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="name">اسم المطعم</Label>
        <Input
          id="name"
          required
          minLength={2}
          value={name}
          onChange={(event) => setName(event.target.value)}
          disabled={isPending}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="slug">رابط المطعم</Label>
        <Input
          id="slug"
          dir="ltr"
          value={slug}
          onChange={(event) => setSlug(event.target.value)}
          disabled={isPending}
        />
        <p className="text-muted-foreground text-xs" dir="ltr">
          /r/{slug || "…"}
        </p>
        {slugChanged && (
          <p className="text-destructive flex items-start gap-1.5 text-xs">
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
            تغيير الرابط يُعطّل أي رابط قديم شاركته مع زبائنك. رموز QR للطاولات
            لا تتأثر.
          </p>
        )}
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
        <Label htmlFor="delivery-fee">رسوم التوصيل (دينار)</Label>
        <Input
          id="delivery-fee"
          type="number"
          inputMode="numeric"
          min={0}
          step={250}
          dir="ltr"
          value={deliveryFee}
          onChange={(event) => setDeliveryFee(event.target.value)}
          disabled={isPending}
        />
        <p className="text-muted-foreground text-xs">
          تُضاف إلى طلبات التوصيل فقط — طلبات الطاولات لا تتأثر.
        </p>
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending && <Loader2 className="animate-spin" />}
        حفظ
      </Button>
    </form>
  );
}
