'use client';

import React from 'react';
import {
  Shield,
  Key,
  Mail,
  BookOpen,
  Settings,
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
  { id: 'licenses', name: 'Key License', icon: Key },
  { id: 'email-licenses', name: 'Email License', icon: Mail },
  { id: 'guide', name: 'Hướng dẫn', icon: BookOpen },
  { id: 'settings', name: 'Thiết lập', icon: Settings },
];

export function AdminNavigation({ activeTab, onTabChange }: AdminNavigationProps) {
  const { user, signOut } = useAuth();

  return (
    <>
      {/* Mobile Bottom Navigation - Grab-style Design */}
      <div className="md:hidden">
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-t border-gray-100 shadow-2xl">
          {/* Better padding for home indicator and visual balance */}
          <div className="pb-6 pt-2">
            <nav className="flex px-3 pt-1 pb-1">
              {adminNavigation.map((item, index) => {
                const isActive = activeTab === item.id;
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
                  },
                  {
                    primary: 'from-teal-500 to-cyan-600',
                    primarySolid: 'bg-teal-500',
                    bg: 'bg-gradient-to-br from-teal-50 to-cyan-50',
                    text: 'text-teal-600',
                    shadow: 'shadow-teal-200',
                    glow: 'shadow-teal-500/20'
                  },
                  {
                    primary: 'from-green-500 to-emerald-600',
                    primarySolid: 'bg-green-500',
                    bg: 'bg-gradient-to-br from-green-50 to-emerald-50',
                    text: 'text-green-600',
                    shadow: 'shadow-green-200',
                    glow: 'shadow-green-500/20'
                  },
                  {
                    primary: 'from-orange-500 to-red-600',
                    primarySolid: 'bg-orange-500',
                    bg: 'bg-gradient-to-br from-orange-50 to-red-50',
                    text: 'text-orange-600',
                    shadow: 'shadow-orange-200',
                    glow: 'shadow-orange-500/20'
                  }
                ];
                const color = colors[index] || colors[0];

                return (
                  <button
                    key={item.id}
                    onClick={() => onTabChange(item.id)}
                    className="flex-1 flex flex-col items-center group relative px-1"
                  >
                    {/* Main Container with proper spacing */}
                    <div className="flex flex-col items-center space-y-1.5 py-2 px-2 rounded-2xl transition-all duration-300 w-full">

                      {/* Icon Container - Grab style */}
                      <div className={`relative transition-all duration-300 ease-out ${
                        isActive ? 'transform scale-110' : 'group-hover:scale-105'
                      }`}>

                        {/* Background Circle */}
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
                          isActive
                            ? `bg-gradient-to-br ${color.primary} shadow-lg ${color.glow}`
                            : 'bg-gray-100 group-hover:bg-gray-200'
                        }`}>

                          {/* Icon */}
                          <item.icon className={`h-5 w-5 transition-all duration-300 ${
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
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
        {/* Spacer for fixed bottom nav */}
        <div className="h-20"></div>
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

          {/* User Info - moved to Settings tab */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
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
          </div>
        </div>
        {/* Spacer for fixed sidebar */}
        <div className="w-64"></div>
      </div>
    </>
  );
}