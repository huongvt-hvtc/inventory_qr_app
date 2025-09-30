'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

export type InstallOutcome = 'accepted' | 'dismissed' | 'ios' | 'unavailable';

interface PWAInstallContextValue {
  canInstall: boolean;
  isIOS: boolean;
  isStandalone: boolean;
  isInstalled: boolean;
  showPrompt: boolean;
  installApp: () => Promise<InstallOutcome>;
  openPrompt: () => void;
  dismissPrompt: () => void;
}

const PWAInstallContext = createContext<PWAInstallContextValue | undefined>(undefined);

export function PWAInstallProvider({ children }: { children: React.ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(ios);

    const standalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    if (localStorage.getItem('pwa-installed')) {
      setIsInstalled(true);
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);

      const dismissed = localStorage.getItem('pwa-install-dismissed');
      if (!dismissed) {
        setTimeout(() => setShowPrompt(true), 3000);
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
      localStorage.setItem('pwa-installed', 'true');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const dismissPrompt = useCallback(() => {
    setShowPrompt(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('pwa-install-dismissed', Date.now().toString());
    }
  }, []);

  const openPrompt = useCallback(() => {
    setShowPrompt(true);
  }, []);

  const installApp = useCallback(async (): Promise<InstallOutcome> => {
    if (isIOS) {
      setShowPrompt(true);
      return 'ios';
    }

    if (!deferredPrompt) {
      setShowPrompt(true);
      return 'unavailable';
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setIsInstalled(true);
      if (typeof window !== 'undefined') {
        localStorage.setItem('pwa-installed', 'true');
      }
    }

    setDeferredPrompt(null);
    setShowPrompt(false);

    return outcome;
  }, [deferredPrompt, isIOS]);

  const value = useMemo<PWAInstallContextValue>(() => ({
    canInstall: !!deferredPrompt,
    isIOS,
    isStandalone,
    isInstalled,
    showPrompt,
    installApp,
    openPrompt,
    dismissPrompt,
  }), [deferredPrompt, dismissPrompt, installApp, isIOS, isInstalled, isStandalone, showPrompt, openPrompt]);

  return (
    <PWAInstallContext.Provider value={value}>
      {children}
    </PWAInstallContext.Provider>
  );
}

export function usePWAInstall(): PWAInstallContextValue {
  const context = useContext(PWAInstallContext);
  if (!context) {
    throw new Error('usePWAInstall must be used within a PWAInstallProvider');
  }
  return context;
}
