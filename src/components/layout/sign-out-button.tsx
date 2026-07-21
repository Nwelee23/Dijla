"use client";

import { useTransition } from "react";
import { LogOut } from "lucide-react";

import { signOut } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={isPending}
      onClick={() => startTransition(async () => void (await signOut()))}
    >
      <LogOut className="size-4" />
      <span className="hidden sm:inline">خروج</span>
    </Button>
  );
}
