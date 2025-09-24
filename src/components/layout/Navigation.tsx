'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Package,
  QrCode,
  Menu,
  X,
  LogOut,
  User,
  Info,
  Smartphone,
  Monitor,
  FolderOpen,
  Settings
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const navigation = [
  { name: 'Tài sản', href: '/assets', icon: FolderOpen },
  { name: 'QR Scanner', href: '/scanner', icon: QrCode },
  { name: 'Cài đặt', href: '/settings', icon: Settings },
];

export function Navigation() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const { user, signOut } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Show header when scrolling up, hide when scrolling down
      if (currentScrollY < lastScrollY || currentScrollY < 10) {
        setIsHeaderVisible(true);
      } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsHeaderVisible(false);
        setIsMobileMenuOpen(false); // Close mobile menu when hiding header
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:fixed md:inset-y-0 md:z-50 md:flex md:w-64 md:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white border-r border-gray-200 px-6 pb-4">
          <div className="flex h-16 shrink-0 items-center">
            <Package className="h-8 w-8 text-blue-600" />
            <span className="ml-2 text-xl font-semibold text-gray-900">
              Kiểm kê tài sản
            </span>
          </div>
          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul role="list" className="-mx-2 space-y-1">
                  {navigation.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <li key={item.name}>
                        <Link
                          href={item.href}
                          className={`group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold transition-colors ${
                            isActive
                              ? 'bg-blue-50 text-blue-600'
                              : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50'
                          }`}
                        >
                          <item.icon className="h-6 w-6 shrink-0" />
                          {item.name}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </li>
            </ul>

            {/* PWA Install Guide Button - Moved above user section */}
            <div className="mt-auto">
              <Button
                onClick={() => setShowInstallGuide(true)}
                className="w-full justify-start bg-purple-600 text-white hover:bg-purple-700 border-0 mb-4"
              >
                <Info className="h-4 w-4 mr-2" />
                Hướng dẫn cài đặt PWA
              </Button>
            </div>

            {/* User Profile Section */}
            {user && (
              <div className="border-t border-gray-200 pt-4">
                <div className="flex items-center gap-3 px-2 py-3">
                  {user.picture ? (
                    <img
                      src={user.picture}
                      alt={user.name}
                      className="h-8 w-8 rounded-full"
                    />
                  ) : (
                    <User className="h-8 w-8 rounded-full bg-gray-200 p-1 text-gray-600" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {user.name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {user.email}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={signOut}
                  variant="ghost"
                  className="w-full justify-start text-gray-700 hover:text-red-600 hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Đăng xuất
                </Button>
              </div>
            )}
          </nav>
        </div>
      </div>

      {/* Mobile Navigation - Hidden top navigation, only bottom navigation */}
      <div className="md:hidden">

        {/* Mobile bottom navigation - Pro Grab-style Design */}
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-t border-gray-100 md:hidden shadow-2xl">
          {/* Minimal padding - just enough to avoid home indicator */}
          <div className="pb-1">
            <nav className="flex px-2 pt-2 pb-2">
              {navigation.map((item, index) => {
                const isActive = pathname === item.href;
                // Define unique colors for each tab
                const colors = [
                  {
                    primary: 'from-purple-500 to-pink-600',
                    primarySolid: 'bg-purple-500',
                    bg: 'bg-gradient-to-br from-purple-50 to-pink-50',
                    text: 'text-purple-600',
                    shadow: 'shadow-purple-200',
                    glow: 'shadow-purple-500/20'
                  },
                  {
                    primary: 'from-blue-500 to-indigo-600',
                    primarySolid: 'bg-blue-500',
                    bg: 'bg-gradient-to-br from-blue-50 to-indigo-50',
                    text: 'text-blue-600',
                    shadow: 'shadow-blue-200',
                    glow: 'shadow-blue-500/20'
                  },
                  {
                    primary: 'from-green-500 to-emerald-600',
                    primarySolid: 'bg-green-500',
                    bg: 'bg-gradient-to-br from-green-50 to-emerald-50',
                    text: 'text-green-600',
                    shadow: 'shadow-green-200',
                    glow: 'shadow-green-500/20'
                  }
                ];
                const color = colors[index] || colors[0];

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="flex-1 flex flex-col items-center group relative px-2"
                  >
                    {/* Main Container with proper spacing */}
                    <div className="flex flex-col items-center space-y-2 py-2 px-3 rounded-2xl transition-all duration-300 w-full">

                      {/* Icon Container - Grab style */}
                      <div className={`relative transition-all duration-300 ease-out ${
                        isActive ? 'transform scale-110' : 'group-hover:scale-105'
                      }`}>

                        {/* Background Circle */}
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                          isActive
                            ? `bg-gradient-to-br ${color.primary} shadow-lg ${color.glow}`
                            : 'bg-gray-100 group-hover:bg-gray-200'
                        }`}>

                          {/* Icon */}
                          <item.icon className={`h-6 w-6 transition-all duration-300 ${
                            isActive
                              ? 'text-white drop-shadow-sm'
                              : 'text-gray-600 group-hover:text-gray-700'
                          }`} />
                        </div>

                        {/* Active Glow Effect */}
                        {isActive && (
                          <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${color.primary} opacity-20 blur-md -z-10`}></div>
                        )}
                      </div>

                      {/* Label - Always visible like Grab */}
                      <span className={`text-xs font-medium transition-all duration-300 text-center leading-tight ${
                        isActive
                          ? `${color.text} font-semibold`
                          : 'text-gray-600 group-hover:text-gray-700'
                      }`}>
                        {item.name}
                      </span>
                    </div>

                    {/* Touch Ripple Effect */}
                    <div className="absolute inset-0 rounded-2xl overflow-hidden">
                      <div className={`absolute inset-0 bg-gradient-to-br ${color.primary} opacity-0 group-active:opacity-10 transition-opacity duration-150 rounded-2xl`}></div>
                    </div>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* Install Guide Modal */}
      {showInstallGuide && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-purple-900 flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  Hướng dẫn cài đặt PWA
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowInstallGuide(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Mobile Installation */}
                <Card className="bg-white shadow-sm">
                  <CardContent className="p-4">
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <Smartphone className="h-4 w-4 text-green-600" />
                      Cài đặt trên Mobile
                    </h4>
                    <div className="space-y-3 text-sm text-gray-600">
                      <div>
                        <div className="font-medium text-gray-800">📱 iOS (Safari):</div>
                        <ol className="list-decimal list-inside space-y-1 ml-2 mt-1">
                          <li>Mở Safari</li>
                          <li>Nhấn nút Chia sẻ</li>
                          <li>Chọn "Add to Home Screen"</li>
                          <li>Nhấn "Add"</li>
                        </ol>
                      </div>
                      <div>
                        <div className="font-medium text-gray-800">🤖 Android (Chrome):</div>
                        <ol className="list-decimal list-inside space-y-1 ml-2 mt-1">
                          <li>Mở Chrome</li>
                          <li>Nhấn menu (3 chấm)</li>
                          <li>Chọn "Add to Home screen"</li>
                          <li>Nhấn "Add"</li>
                        </ol>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Desktop Installation */}
                <Card className="bg-white shadow-sm">
                  <CardContent className="p-4">
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <Monitor className="h-4 w-4 text-purple-600" />
                      Cài đặt trên Desktop
                    </h4>
                    <div className="space-y-3 text-sm text-gray-600">
                      <div>
                        <div className="font-medium text-gray-800">💻 Chrome/Edge:</div>
                        <ol className="list-decimal list-inside space-y-1 ml-2 mt-1">
                          <li>Tìm icon "Install" trên address bar</li>
                          <li>Hoặc nhấn menu → "Install Kiểm kê tài sản"</li>
                          <li>Nhấn "Install"</li>
                        </ol>
                      </div>
                      <div className="bg-purple-50 p-3 rounded mt-3">
                        <div className="text-xs text-purple-800 font-medium">✨ Lợi ích PWA:</div>
                        <ul className="text-xs text-purple-700 mt-1 space-y-1">
                          <li>• Hoạt động offline</li>
                          <li>• Tốc độ nhanh hơn</li>
                          <li>• Giao diện như app native</li>
                          <li>• Không cần App Store</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}