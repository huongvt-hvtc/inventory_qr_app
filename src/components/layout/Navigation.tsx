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
  FolderOpen
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const navigation = [
  { name: 'Tài sản', href: '/assets', icon: FolderOpen },
  { name: 'QR Scanner', href: '/scanner', icon: QrCode },
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
              Asset QR
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

      {/* Mobile Navigation */}
      <div className="md:hidden">
        {/* Mobile header */}
        <div className={`fixed top-0 left-0 right-0 z-40 flex h-16 items-center justify-between bg-white border-b border-gray-200 px-4 transition-transform duration-300 ${
          isHeaderVisible ? 'translate-y-0' : '-translate-y-full'
        }`}>
          <div className="flex items-center">
            <Package className="h-8 w-8 text-blue-600" />
            <span className="ml-2 text-xl font-semibold text-gray-900">
              Asset QR
            </span>
          </div>
          <div className="flex items-center gap-3">
            {user && user.picture && (
              <img
                src={user.picture}
                alt={user.name}
                className="h-8 w-8 rounded-full"
              />
            )}
            <button
              type="button"
              className="text-gray-700 hover:text-blue-600"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu - Enhanced professional dropdown */}
        {isMobileMenuOpen && (
          <div className="fixed top-16 left-0 right-0 z-50 bg-white shadow-xl border-b border-gray-200 backdrop-blur-md">
            {/* Subtle overlay background */}
            <div className="absolute inset-0 bg-gradient-to-b from-white to-gray-50"></div>

            <nav className="relative px-4 py-4">
              {/* Navigation Items Section */}
              <div className="space-y-1 mb-4">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 py-1">
                  Navigation
                </h3>
                {navigation.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`flex items-center gap-x-3 rounded-lg px-4 py-3 text-base font-medium transition-all duration-200 ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50 hover:shadow-sm'
                      }`}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      <span>{item.name}</span>
                      {isActive && (
                        <div className="ml-auto w-2 h-2 bg-white rounded-full"></div>
                      )}
                    </Link>
                  );
                })}
              </div>

              {/* PWA Install Section */}
              <div className="mb-4">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 py-1 mb-2">
                  Tools
                </h3>
                <Button
                  onClick={() => {
                    setShowInstallGuide(true);
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full justify-start bg-purple-600 text-white hover:bg-purple-700 border-0 rounded-lg py-3 px-4 font-medium text-base shadow-md hover:shadow-lg transition-all duration-200"
                >
                  <Info className="h-5 w-5 mr-3" />
                  <span>Hướng dẫn cài đặt PWA</span>
                </Button>
              </div>

              {/* User Profile Section */}
              {user && (
                <div className="border-t border-gray-200 pt-4">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 py-1 mb-3">
                    Account
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-4 mb-3">
                    <div className="flex items-center gap-3 mb-3">
                      {user.picture ? (
                        <img
                          src={user.picture}
                          alt={user.name}
                          className="h-10 w-10 rounded-full ring-2 ring-white shadow-sm"
                        />
                      ) : (
                        <User className="h-10 w-10 rounded-full bg-gray-200 p-2 text-gray-600 ring-2 ring-white shadow-sm" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {user.name}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {user.email}
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => {
                        signOut();
                        setIsMobileMenuOpen(false);
                      }}
                      variant="ghost"
                      className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg py-2 font-medium transition-colors duration-200"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Đăng xuất
                    </Button>
                  </div>
                </div>
              )}
            </nav>
          </div>
        )}

        {/* Mobile bottom navigation - Pro Grab-style Design */}
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-t border-gray-100 md:hidden shadow-2xl">
          {/* Safe area padding for devices with home indicator */}
          <div className="pb-safe">
            <nav className="flex px-4 pt-3 pb-6">
              {navigation.map((item, index) => {
                const isActive = pathname === item.href;
                // Define unique colors for each tab
                const colors = [
                  {
                    primary: 'from-blue-500 to-indigo-600',
                    primarySolid: 'bg-blue-500',
                    bg: 'bg-gradient-to-br from-blue-50 to-indigo-50',
                    text: 'text-blue-600',
                    shadow: 'shadow-blue-200',
                    glow: 'shadow-blue-500/20'
                  },
                  {
                    primary: 'from-purple-500 to-pink-600',
                    primarySolid: 'bg-purple-500',
                    bg: 'bg-gradient-to-br from-purple-50 to-pink-50',
                    text: 'text-purple-600',
                    shadow: 'shadow-purple-200',
                    glow: 'shadow-purple-500/20'
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

                      {/* Active Indicator Dot */}
                      {isActive && (
                        <div className={`w-1 h-1 rounded-full bg-gradient-to-r ${color.primary} mt-1`}></div>
                      )}
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
                          <li>Hoặc nhấn menu → "Install Asset Inventory QR"</li>
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