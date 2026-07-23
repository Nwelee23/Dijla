import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Direction } from "radix-ui";

import { I18nProvider } from "@/components/i18n/i18n-provider";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { OfflineBanner } from "@/components/pwa/offline-banner";
import { ServiceWorkerRegistrar } from "@/components/pwa/service-worker-registrar";
import { Toaster } from "@/components/ui/sonner";
import { LOCALE_META } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";
import "./globals.css";

// Self-hosted so the production build never depends on a network call to Google
// Fonts. The Arabic and Latin subsets are disjoint glyph sets, so the browser
// picks the right face per character. Variable woff2 covers 200–1000.
const cairo = localFont({
  variable: "--font-sans",
  display: "swap",
  fallback: ["system-ui", "Segoe UI", "Tahoma", "Arial", "sans-serif"],
  src: [
    { path: "./fonts/cairo-arabic.woff2", weight: "200 1000", style: "normal" },
    { path: "./fonts/cairo-latin.woff2", weight: "200 1000", style: "normal" },
  ],
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
      className={`${cairo.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <I18nProvider locale={locale} dictionary={dictionary}>
          {/* Radix reads direction from here for menus, sliders and tabs. */}
          <Direction.DirectionProvider dir={dir}>
            <OfflineBanner />
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
