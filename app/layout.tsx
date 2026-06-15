import type { Metadata, Viewport } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { ServiceWorkerRegister } from "@/components/layout/ServiceWorkerRegister";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "TABLE",
    template: "%s | TABLE"
  },
  description: "A private shared archive of meals, places, recipes and food memories.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "TABLE"
  },
  icons: {
    icon: [
      { url: "/icon-192-v2.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512-v2.png", sizes: "512x512", type: "image/png" },
      { url: "/icons/icon.svg", type: "image/svg+xml" }
    ],
    apple: "/apple-touch-icon-v2.png"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#f7f4ef"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
