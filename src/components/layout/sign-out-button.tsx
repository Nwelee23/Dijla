"use client";

import { useTransition } from "react";
import { LogOut } from "lucide-react";

import { useT } from "@/components/i18n/i18n-provider";
import { signOut } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const t = useT();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={isPending}
      onClick={() => startTransition(async () => void (await signOut()))}
    >
      <LogOut className="size-4" />
      <span className="hidden sm:inline">{t.nav.signOut}</span>
    </Button>
  );
}
