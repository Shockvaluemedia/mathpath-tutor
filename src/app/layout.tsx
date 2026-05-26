import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/providers/auth-provider";
import { ToastProvider } from "@/components/ui/toast";
import { XPProvider } from "@/components/ui/xp-notification";
import { ServiceWorkerRegistration } from "@/components/providers/sw-provider";
import { InstallPrompt } from "@/components/ui/install-prompt";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MathPath Tutor - Personalized Math Growth",
  description: "Adaptive AI math tutoring from grade school to high school. Diagnose skill gaps, build confidence, and create personalized daily learning paths.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "MathPath",
  },
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className={`${inter.className} antialiased`}>
        <AuthProvider>
          <ToastProvider>
            <XPProvider>
              {children}
              <InstallPrompt />
              <ServiceWorkerRegistration />
            </XPProvider>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
