import Link from "next/link";

import { Brand } from "@/components/layout/brand";
import { Button } from "@/components/ui/button";
import { getUser } from "@/lib/auth/user";

export default async function Home() {
  const user = await getUser();

  return (
    <>
      <header className="border-b">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
          <Brand />
          <Button asChild variant="ghost" size="sm">
            <Link href={user ? "/dashboard" : "/login"}>
              {user ? "لوحة التحكم" : "تسجيل الدخول"}
            </Link>
          </Button>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold">دجلة</h1>
          <p className="text-muted-foreground max-w-sm text-balance">
            منصة الطلبات والتشغيل للمطاعم العراقية — اشتراك شهري ثابت، بدون
            عمولة على الطلبات.
          </p>
        </div>
        <Button asChild>
          <Link href="/ui-demo">معاينة نظام التصميم</Link>
        </Button>
      </main>
    </>
  );
}
