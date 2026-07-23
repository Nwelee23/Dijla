"use client";

import { useState } from "react";
import { TrendingUp } from "lucide-react";

import { useT } from "@/components/i18n/i18n-provider";
import { interpolate } from "@/lib/i18n";
import { PRICING } from "@/lib/pricing";
import { formatMoney } from "@/lib/utils";

/**
 * The landing page's strongest element (§B.2): it reframes the subscription from
 * a cost into a saving. The visitor enters their monthly order count and average
 * order value; it shows the ~25% commission a delivery app takes today versus
 * the flat Dijla subscription, and the monthly saving in large accent type.
 */
export function SavingsCalculator() {
  const t = useT();
  const [orders, setOrders] = useState(300);
  const [avg, setAvg] = useState(10_000);

  const commissionToday = Math.round(orders * avg * PRICING.commissionRate);
  const dijla = PRICING.pro.monthly;
  const saving = commissionToday - dijla;

  return (
    <div className="dj-glass mx-auto w-full max-w-lg space-y-5 p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1.5 text-sm">
          <span style={{ color: "var(--dj-muted)" }}>{t.landing.calcOrders}</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            step={10}
            dir="ltr"
            className="dj-input"
            style={{ paddingInline: "14px" }}
            value={orders}
            onChange={(e) => setOrders(Math.max(0, Number(e.target.value)))}
          />
        </label>
        <label className="space-y-1.5 text-sm">
          <span style={{ color: "var(--dj-muted)" }}>{t.landing.calcAvg}</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            step={1000}
            dir="ltr"
            className="dj-input"
            style={{ paddingInline: "14px" }}
            value={avg}
            onChange={(e) => setAvg(Math.max(0, Number(e.target.value)))}
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3 text-center text-sm">
        <div className="rounded-xl p-3" style={{ border: "1px solid var(--dj-line)" }}>
          <p style={{ color: "var(--dj-muted)" }}>{t.landing.calcYouPayToday}</p>
          <p className="text-lg font-bold tabular-nums" style={{ color: "var(--dj-danger)" }}>
            {formatMoney(commissionToday)}
          </p>
          <p className="text-xs" style={{ color: "var(--dj-muted)" }}>{t.landing.calcCommissionNote}</p>
        </div>
        <div className="rounded-xl p-3" style={{ border: "1px solid var(--dj-line)" }}>
          <p style={{ color: "var(--dj-muted)" }}>{t.landing.calcWithDijla}</p>
          <p className="text-lg font-bold tabular-nums" style={{ color: "var(--dj-success)" }}>
            {formatMoney(dijla)}
          </p>
          <p className="text-xs" style={{ color: "var(--dj-muted)" }}>{t.landing.calcPerMonth}</p>
        </div>
      </div>

      {saving > 0 && (
        <div className="text-center">
          <p className="flex items-center justify-center gap-2 text-sm" style={{ color: "var(--dj-muted)" }}>
            <TrendingUp className="size-4" style={{ color: "var(--dj-cta)" }} />
            {t.landing.calcYouSave}
          </p>
          <p className="text-4xl font-black tabular-nums" style={{ color: "var(--dj-cta)" }}>
            {formatMoney(saving)}
          </p>
          <p className="text-xs" style={{ color: "var(--dj-muted)" }}>
            {interpolate(t.landing.calcYearly, { amount: formatMoney(saving * 12) })}
          </p>
        </div>
      )}
    </div>
  );
}
