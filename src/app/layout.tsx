import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/providers/auth-provider";
import { ToastProvider } from "@/components/ui/toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MathPath Tutor - Personalized Math Growth",
  description: "Adaptive AI math tutoring from grade school to high school. Diagnose skill gaps, build confidence, and create personalized daily learning paths.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <AuthProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
