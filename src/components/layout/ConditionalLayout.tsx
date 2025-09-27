'use client';

import { usePathname } from 'next/navigation';
import { Navigation } from './Navigation';

interface ConditionalLayoutProps {
  children: React.ReactNode;
}

export default function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const pathname = usePathname();

  // Check if current route is admin
  const isAdminRoute = pathname.startsWith('/admin');

  if (isAdminRoute) {
    // Admin routes: No main navigation, render children directly
    return <>{children}</>;
  }

  // Main app routes: Show navigation with sidebar/bottom nav
  return (
    <>
      <Navigation />
      {/* Main Content Area */}
      <main className="md:ml-64 pb-24 md:pb-0 pt-4 md:pt-6">
        {children}
      </main>
    </>
  );
}