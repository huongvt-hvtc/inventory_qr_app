import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navigation } from "@/components/layout/Navigation";
import PWAInstallPrompt from "@/components/layout/PWAInstallPrompt";
import { OfflineStatusIndicator } from "@/components/offline/OfflineStatusIndicator";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "@/contexts/AuthContext";
import AuthGuard from "@/components/auth/AuthGuard";

const inter = Inter({ subsets: ["latin", "vietnamese"] });

export const metadata: Metadata = {
  title: "Asset Inventory QR Management",
  description: "Professional asset inventory management system with QR code tracking",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/icon-192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Asset QR",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#2563eb",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="h-full">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Asset QR" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#2563eb" />
      </head>
      <body className={`${inter.className} h-full bg-gray-50`}>
        <AuthProvider>
          <AuthGuard>
            <div className="min-h-screen">
              <Navigation />

              {/* Main Content Area */}
              <main className="md:ml-64 pb-16 md:pb-0">
                <div className="max-w-full px-4 sm:px-6 lg:px-8 py-6">
                  {children}
                </div>
              </main>

              {/* Offline Status Indicator */}
              <OfflineStatusIndicator />
            </div>

            <PWAInstallPrompt />
          </AuthGuard>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#363636',
                color: '#fff',
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
