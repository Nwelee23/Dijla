import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import { Direction } from "radix-ui";

import { InstallPrompt } from "@/components/pwa/install-prompt";
import { ServiceWorkerRegistrar } from "@/components/pwa/service-worker-registrar";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const cairo = Cairo({
  variable: "--font-sans",
  subsets: ["arabic", "latin"],
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${cairo.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Direction.DirectionProvider dir="rtl">
          {children}
          <InstallPrompt />
          <Toaster position="top-center" richColors />
          <ServiceWorkerRegistrar />
        </Direction.DirectionProvider>
      </body>
    </html>
  );
}
