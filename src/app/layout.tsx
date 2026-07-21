import type { Metadata, Viewport } from "next";
import { Cairo, Noto_Sans_Arabic } from "next/font/google";
import { Direction } from "radix-ui";

import { I18nProvider } from "@/components/i18n/i18n-provider";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { ServiceWorkerRegistrar } from "@/components/pwa/service-worker-registrar";
import { Toaster } from "@/components/ui/sonner";
import { LOCALE_META } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";
import "./globals.css";

const cairo = Cairo({
  variable: "--font-sans",
  subsets: ["arabic", "latin"],
  display: "swap",
});

/**
 * Sorani uses Arabic script plus letters Cairo does not cover (ڕ ڵ ۆ ێ ڤ).
 * Browsers fall back per glyph, so listing Noto after Cairo keeps Arabic looking
 * like Cairo while Kurdish letters still render instead of showing tofu boxes.
 */
const notoArabic = Noto_Sans_Arabic({
  variable: "--font-arabic-fallback",
  subsets: ["arabic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "دجلة | Dijla",
  description: "منصة الطلبات والتشغيل للمطاعم العراقية — بدون عمولة على الطلبات.",
  manifest: "/manifest.json",
  applicationName: "دجلة",
  appleWebApp: {
    capable: true,
    title: "دجلة",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  // Matches --brand / manifest theme_color, so the status bar blends with the app.
  themeColor: "#008383",
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const dictionary = getDictionary(locale);
  const { dir, tag } = LOCALE_META[locale];

  return (
    <html
      lang={tag}
      dir={dir}
      className={`${cairo.variable} ${notoArabic.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <I18nProvider locale={locale} dictionary={dictionary}>
          {/* Radix reads direction from here for menus, sliders and tabs. */}
          <Direction.DirectionProvider dir={dir}>
            {children}
            <InstallPrompt />
            <Toaster position="top-center" richColors />
            <ServiceWorkerRegistrar />
          </Direction.DirectionProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
