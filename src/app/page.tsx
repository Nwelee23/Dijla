import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  Bike,
  Check,
  LayoutDashboard,
  MapPin,
  MessageCircle,
  Printer,
  QrCode,
  UserPlus,
  UtensilsCrossed,
  Waves,
} from "lucide-react";

import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { SavingsCalculator } from "@/components/landing/savings-calculator";
import { getUser } from "@/lib/auth/user";
import { getT } from "@/lib/i18n/server";
import { PRICING, TIER_FEATURES } from "@/lib/pricing";
import { formatMoney } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  const title = `${t.brand.name} — ${t.landing.heroHeadline}`;
  return {
    title,
    description: t.landing.heroSub,
    openGraph: {
      title,
      description: t.landing.heroSub,
      locale: "ar_IQ",
      type: "website",
      siteName: t.brand.name,
    },
  };
}

export default async function Home() {
  const [user, t] = await Promise.all([getUser(), getT()]);
  const support = process.env.NEXT_PUBLIC_SUPPORT_PHONE;
  const whatsapp = support ? `https://wa.me/${support.replace(/[^0-9]/g, "")}` : null;

  const features = [
    { icon: QrCode, title: t.landing.featQrTitle, desc: t.landing.featQrDesc },
    { icon: Bike, title: t.landing.featDeliveryTitle, desc: t.landing.featDeliveryDesc },
    { icon: LayoutDashboard, title: t.landing.featDashboardTitle, desc: t.landing.featDashboardDesc },
    { icon: BarChart3, title: t.landing.featReportsTitle, desc: t.landing.featReportsDesc },
  ];

  const steps = [
    { icon: UserPlus, title: t.landing.step1 },
    { icon: UtensilsCrossed, title: t.landing.step2 },
    { icon: Printer, title: t.landing.step3 },
  ];

  const featLabel = (key: string) => t.landing.feat[key as keyof typeof t.landing.feat] ?? key;

  return (
    <div className="dj-auth flex flex-1 flex-col">
      <header className="sticky top-0 z-10" style={{ backdropFilter: "blur(8px)" }}>
        <div className="mx-auto flex w-full max-w-5xl items-center gap-3 p-4">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <span className="dj-logo-tile size-9">
              <Waves className="size-5" />
            </span>
            {t.brand.name}
          </Link>
          <nav className="ms-auto flex items-center gap-1 text-sm">
            <a href="#features" className="dj-link hidden px-2 sm:inline">{t.landing.navFeatures}</a>
            <a href="#pricing" className="dj-link hidden px-2 sm:inline">{t.landing.navPricing}</a>
            <LanguageSwitcher variant="ghost" />
            <Link href={user ? "/dashboard" : "/login"} className="dj-link px-2">
              {user ? t.nav.dashboard : t.home.signIn}
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 space-y-20 px-4 py-12">
        {/* Hero */}
        <section className="space-y-6 text-center">
          <span className="dj-glass inline-flex items-center gap-1.5 px-3 py-1 text-xs" style={{ borderRadius: "9999px" }}>
            <MapPin className="size-3.5" style={{ color: "var(--dj-cta)" }} />
            {t.landing.madeInNajaf}
          </span>
          <h1 className="mx-auto max-w-3xl text-4xl font-black leading-tight sm:text-5xl">
            {t.landing.heroHeadline}
          </h1>
          <p className="mx-auto max-w-xl text-base" style={{ color: "var(--dj-muted)" }}>
            {t.landing.heroSub}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/signup" className="dj-btn" style={{ width: "auto", paddingInline: "28px" }}>
              {t.landing.ctaTrial}
              <ArrowLeft className="size-4 rtl:rotate-180" />
            </Link>
            {whatsapp && (
              <a
                href={whatsapp}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl px-6 py-3 font-medium"
                style={{ border: "1px solid var(--dj-line)", color: "var(--dj-fg)" }}
              >
                <MessageCircle className="size-4" />
                {t.landing.ctaWhatsapp}
              </a>
            )}
          </div>
          <p className="text-sm" style={{ color: "var(--dj-muted)" }}>{t.landing.reassure}</p>
        </section>

        {/* Savings calculator */}
        <section className="space-y-4">
          <div className="text-center">
            <h2 className="text-2xl font-bold">{t.landing.calcTitle}</h2>
            <p className="text-sm" style={{ color: "var(--dj-muted)" }}>{t.landing.calcSub}</p>
          </div>
          <SavingsCalculator />
        </section>

        {/* Features */}
        <section id="features" className="space-y-6">
          <h2 className="text-center text-2xl font-bold">{t.landing.featuresTitle}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div key={f.title} className="dj-glass space-y-2 p-5">
                <f.icon className="size-6" style={{ color: "var(--dj-cta)" }} />
                <h3 className="font-bold">{f.title}</h3>
                <p className="text-sm" style={{ color: "var(--dj-muted)" }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Steps */}
        <section className="space-y-6">
          <h2 className="text-center text-2xl font-bold">{t.landing.stepsTitle}</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {steps.map((s, i) => (
              <div key={s.title} className="dj-glass flex items-start gap-3 p-5">
                <span className="dj-logo-tile size-10 shrink-0 text-lg font-black">{i + 1}</span>
                <div className="space-y-1">
                  <s.icon className="size-5" style={{ color: "var(--dj-cta)" }} />
                  <p className="text-sm font-medium">{s.title}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="space-y-6">
          <h2 className="text-center text-2xl font-bold">{t.landing.pricingTitle}</h2>
          <div className="mx-auto grid max-w-2xl gap-4 sm:grid-cols-2">
            <PlanCard
              name={t.landing.planBasic}
              price={PRICING.basic.monthly}
              perMonth={t.landing.perMonth}
              features={TIER_FEATURES.basic.map(featLabel)}
              cta={t.landing.choosePlan}
            />
            <PlanCard
              name={t.landing.planPro}
              price={PRICING.pro.monthly}
              perMonth={t.landing.perMonth}
              features={TIER_FEATURES.pro.map(featLabel)}
              cta={t.landing.choosePlan}
              popular={t.landing.mostPopular}
            />
          </div>
          <p className="text-center text-sm" style={{ color: "var(--dj-success)" }}>
            {t.landing.noCommission}
          </p>
        </section>

        {/* Final CTA */}
        <section className="dj-glass space-y-4 p-8 text-center">
          <h2 className="text-2xl font-bold">{t.landing.finalTitle}</h2>
          <p style={{ color: "var(--dj-muted)" }}>{t.landing.finalSub}</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/signup" className="dj-btn" style={{ width: "auto", paddingInline: "28px" }}>
              {t.landing.ctaTrial}
            </Link>
            {whatsapp && (
              <a href={whatsapp} target="_blank" rel="noreferrer" className="dj-link inline-flex items-center gap-1.5" dir="ltr">
                <MessageCircle className="size-4" />
                {support}
              </a>
            )}
          </div>
        </section>
      </main>

      <footer className="mx-auto w-full max-w-5xl px-4 py-8 text-center text-xs" style={{ color: "var(--dj-muted)" }}>
        {t.brand.name} — {t.landing.madeInNajaf}
      </footer>
    </div>
  );
}

function PlanCard({
  name,
  price,
  perMonth,
  features,
  cta,
  popular,
}: {
  name: string;
  price: number;
  perMonth: string;
  features: string[];
  cta: string;
  popular?: string;
}) {
  return (
    <div className="dj-glass space-y-4 p-6" style={popular ? { borderColor: "var(--dj-cta)" } : undefined}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">{name}</h3>
        {popular && (
          <span className="rounded-full px-2 py-0.5 text-xs font-bold" style={{ background: "var(--dj-cta)", color: "var(--dj-cta-fg)" }}>
            {popular}
          </span>
        )}
      </div>
      <p>
        <span className="text-3xl font-black tabular-nums">{formatMoney(price)}</span>
        <span className="text-sm" style={{ color: "var(--dj-muted)" }}> {perMonth}</span>
      </p>
      <ul className="space-y-2 text-sm">
        {features.map((f) => (
          <li key={f} className="flex items-center gap-2">
            <Check className="size-4 shrink-0" style={{ color: "var(--dj-cta)" }} />
            {f}
          </li>
        ))}
      </ul>
      <Link href="/signup" className="dj-btn">{cta}</Link>
    </div>
  );
}
