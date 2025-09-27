import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin Dashboard - Quản lý Subscription',
  description: 'Quản lý license keys, công ty và người dùng',
  manifest: '/admin-manifest.json',
  themeColor: '#2563eb',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
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

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}