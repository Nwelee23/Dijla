"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export type ConnectionCheck = {
  label: string;
  ok: boolean;
  detail: string;
};

/**
 * Verifies the Supabase wiring from the server: the anon/RLS client and the
 * server-only service_role client. Runs entirely on the server — nothing here,
 * including the service_role key, reaches the browser.
 */
export async function checkSupabaseConnection(): Promise<ConnectionCheck[]> {
  const checks: ConnectionCheck[] = [];

  // 1. Reachability — a real round-trip to the REST endpoint with the anon key.
  //    Note: auth.getUser() is NOT enough here; with no session it returns an error
  //    locally without ever touching the network, which would mask a bad URL.
  const label = "الرابط + مفتاح anon";
  try {
    // /auth/v1/health accepts the anon key; the REST root deliberately does not,
    // so probing the REST root would report a false failure.
    const response = await fetch(`${supabaseUrl()}/auth/v1/health`, {
      headers: { apikey: supabaseAnonKey() },
      cache: "no-store",
    });

    if (response.ok) {
      checks.push({
        label,
        ok: true,
        detail: `تم الوصول إلى المشروع والمفتاح مقبول (HTTP ${response.status}).`,
      });
    } else {
      checks.push({
        label,
        ok: false,
        detail: `الرابط يستجيب لكن المفتاح مرفوض (HTTP ${response.status}). تأكد من publishable key.`,
      });
    }
  } catch (error) {
    checks.push({
      label,
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    });
  }

  // 2. service_role client — proves the server-only key works and stays server-side.
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.listUsers({ perPage: 1 });

    if (error) {
      checks.push({
        label: "عميل service_role (خادم فقط)",
        ok: false,
        detail: error.message,
      });
    } else {
      checks.push({
        label: "عميل service_role (خادم فقط)",
        ok: true,
        detail: `قراءة إدارية ناجحة — عدد المستخدمين المُعادين: ${data.users.length}.`,
      });
    }
  } catch (error) {
    checks.push({
      label: "عميل service_role (خادم فقط)",
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    });
  }

  // 3. Real table read — only meaningful after the migration in task 0.4.
  try {
    const supabase = await createClient();
    // No `head: true` here — with an empty body a failed request can look like a
    // successful count of 0, which hides real errors.
    const { data, error } = await supabase
      .from("restaurants")
      .select("id")
      .limit(1);

    if (error) {
      const notCreatedYet =
        error.code === "PGRST205" || error.message.includes("does not exist");

      checks.push({
        label: "قراءة جدول restaurants",
        ok: false,
        detail: notCreatedYet
          ? "الجدول غير موجود بعد — يُنشأ في المهمة 0.4 (المخطط + RLS)."
          : `${error.code ?? ""} ${error.message}`.trim(),
      });
    } else {
      checks.push({
        label: "قراءة جدول restaurants",
        ok: true,
        detail: `تمت القراءة عبر RLS — الصفوف المرئية: ${data?.length ?? 0}.`,
      });
    }
  } catch (error) {
    checks.push({
      label: "قراءة جدول restaurants",
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    });
  }

  return checks;
}
