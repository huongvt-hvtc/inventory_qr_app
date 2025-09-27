'use client';

import React from 'react';
import {
  Shield,
  Key,
  BookOpen,
  LogOut,
  User
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

interface AdminNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const adminNavigation = [
  { id: 'dashboard', name: 'Dashboard', icon: Shield },
  { id: 'licenses', name: 'Licenses', icon: Key },
  { id: 'guide', name: 'Hướng dẫn', icon: BookOpen },
];

export function AdminNavigation({ activeTab, onTabChange }: AdminNavigationProps) {
  const { user, signOut } = useAuth();

  return (
    <>
      {/* Mobile Bottom Navigation */}
      <div className="md:hidden">
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
          <div className="grid grid-cols-4 h-16">
            {adminNavigation.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`flex flex-col items-center justify-center px-2 py-1 text-xs font-medium transition-colors ${
                    isActive
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className={`h-5 w-5 mb-1 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                  <span className="truncate">{item.name}</span>
                </button>
              );
            })}
            {/* Logout Button */}
            <button
              onClick={signOut}
              className="flex flex-col items-center justify-center px-2 py-1 text-xs font-medium text-red-500 hover:text-red-700 transition-colors"
            >
              <LogOut className="h-5 w-5 mb-1" />
              <span className="truncate">Đăng xuất</span>
            </button>
          </div>
        </div>
        {/* Spacer for fixed bottom nav */}
        <div className="h-16"></div>
      </div>

      {/* Desktop Sidebar Navigation */}
      <div className="hidden md:block">
        <div className="fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-gray-200 flex flex-col z-40">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-2 rounded-xl">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Inventory QR</h1>
                <p className="text-sm text-gray-600">Admin Dashboard</p>
              </div>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 p-4 space-y-2">
            {adminNavigation.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {item.name}
                </button>
              );
            })}
          </nav>

          {/* User Info & Logout */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 mb-3">
              {user?.picture ? (
                <img
                  src={user.picture}
                  alt={user.name}
                  className="h-8 w-8 rounded-full border-2 border-blue-100"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <User className="h-4 w-4 text-blue-600" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.name}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {user?.email}
                </p>
              </div>
            </div>
            <Button
              onClick={signOut}
              variant="outline"
              className="w-full text-red-600 border-red-200 hover:bg-red-50"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Đăng xuất
            </Button>
          </div>
        </div>
        {/* Spacer for fixed sidebar */}
        <div className="w-64"></div>
      </div>
    </>
  );
}