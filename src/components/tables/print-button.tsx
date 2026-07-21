"use client";

import { Printer } from "lucide-react";

import { useT } from "@/components/i18n/i18n-provider";
import { Button } from "@/components/ui/button";

export function PrintButton() {
  const t = useT();

  return (
    <Button onClick={() => window.print()}>
      <Printer />
      {t.qr.print}
    </Button>
  );
}
