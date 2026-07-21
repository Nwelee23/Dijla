"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { registerDriver } from "@/app/dashboard/drivers/actions";
import { useT } from "@/components/i18n/i18n-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RegisterDriverDialog({
  trigger,
  onRegistered,
}: {
  trigger: React.ReactNode;
  /** Called with the phone and the one-time code to reveal to the owner. */
  onRegistered: (phone: string, code: string) => void;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  function submit() {
    startTransition(async () => {
      const result = await registerDriver(name, phone);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setOpen(false);
      setName("");
      setPhone("");
      // The code dialog opens from the parent, so it survives this one closing.
      onRegistered(result.phone, result.code);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.drivers.addDriver}</DialogTitle>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="driver-name">{t.drivers.driverName}</Label>
            <Input
              id="driver-name"
              required
              minLength={2}
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={isPending}
              placeholder={t.drivers.driverNamePlaceholder}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="driver-phone">{t.common.phone}</Label>
            <Input
              id="driver-phone"
              type="tel"
              inputMode="tel"
              dir="ltr"
              required
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              disabled={isPending}
              placeholder={t.common.phonePlaceholder}
            />
            <p className="text-muted-foreground text-xs">{t.drivers.phoneHint}</p>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="animate-spin" />}
              {t.drivers.register}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
