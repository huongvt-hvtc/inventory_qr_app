import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Admin Dashboard - Quản lý Subscription',
  description: 'Quản lý license keys, công ty và người dùng',
  manifest: '/admin-manifest.json',
  icons: {
    icon: '/admin-icon-192.png',
    apple: '/admin-icon-192.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Admin Dashboard',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#2563eb',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}