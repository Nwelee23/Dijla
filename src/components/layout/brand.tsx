"use client";

import Image from "next/image";
import Link from "next/link";

import { useT } from "@/components/i18n/i18n-provider";

/** The Dijla wordmark. Placeholder logo — see scripts/generate-icons.mjs. */
export function Brand({ href = "/" }: { href?: string }) {
  const t = useT();

  return (
    <Link href={href} className="flex items-center gap-2">
      <Image
        src="/icons/icon-192.png"
        alt=""
        width={28}
        height={28}
        className="rounded-md"
      />
      <span className="text-lg font-bold">{t.brand.name}</span>
    </Link>
  );
}
