import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";
import ConditionalLayout from "@/components/layout/ConditionalLayout";
import PWAInstallPrompt from "@/components/layout/PWAInstallPrompt";
import { OfflineStatusIndicator } from "@/components/offline/OfflineStatusIndicator";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "@/contexts/AuthContext";
import { RecentScansProvider } from "@/contexts/RecentScansContext";
import { RefreshProvider } from "@/contexts/RefreshContext";
import { PWAInstallProvider } from "@/contexts/PWAInstallContext";
import { NetworkProvider } from "@/contexts/NetworkContext";
import AuthGuard from "@/components/auth/AuthGuard";
import VisibilityHandler from "@/components/layout/VisibilityHandler";
import MobilePWAFix from "@/components/layout/MobilePWAFix";
import SupabasePingProvider from "@/components/SupabasePingProvider";

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-be-vietnam-pro"
});

export const metadata: Metadata = {
  title: "Kiểm kê tài sản",
  description: "Hệ thống quản lý tài sản chuyên nghiệp với mã QR",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/icon-192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Kiểm kê tài sản",
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
    <html lang="vi" className="h-full" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Kiểm kê tài sản" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#2563eb" />
      </head>
      <body className={`${beVietnamPro.variable} font-sans h-full bg-gray-50`}>
        <PWAInstallProvider>
          <AuthProvider>
            <NetworkProvider>
              <RecentScansProvider>
                <RefreshProvider>
                  <AuthGuard>
            {/* Prevent tab switch reloads */}
            <VisibilityHandler />

            {/* Mobile PWA fixes */}
            <MobilePWAFix />

            {/* Supabase auto-ping to prevent project pause */}
            <SupabasePingProvider />

            <div className="min-h-screen">
              <ConditionalLayout>
                {children}
              </ConditionalLayout>

              {/* Offline Status Indicator */}
              <OfflineStatusIndicator />
            </div>

            <PWAInstallPrompt />
                  </AuthGuard>
                </RefreshProvider>
              </RecentScansProvider>
            </NetworkProvider>
          </AuthProvider>
        </PWAInstallProvider>
        <Toaster
            position="top-center"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#363636',
                color: '#fff',
                marginTop: '60px', // Avoid header overlap on mobile
                zIndex: 9999, // Ensure toast appears above all content
              },
            }}
            containerStyle={{
              zIndex: 9999,
            }}
          />
      </body>
    </html>
  );
}
