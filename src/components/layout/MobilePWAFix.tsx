'use client';

import { useEffect } from 'react';

export default function MobilePWAFix() {
  useEffect(() => {
    // Handle iOS PWA status bar
    if ('standalone' in window.navigator) {
      const isStandalone = (window.navigator as any).standalone;
      if (isStandalone) {
        document.body.classList.add('pwa-standalone');
      }
    }

    // Prevent pull-to-refresh on mobile
    let lastY = 0;
    const preventPullToRefresh = (e: TouchEvent) => {
      const y = e.touches[0].pageY;
      const scrollTop = window.scrollY;

      if (scrollTop === 0 && y > lastY) {
        e.preventDefault();
      }
      lastY = y;
    };

    // Prevent iOS elastic scrolling that can trigger reloads
    const preventElasticScroll = (e: TouchEvent) => {
      if (e.touches.length > 1) return;

      const scrollTop = window.scrollY;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = document.documentElement.clientHeight;

      if (scrollTop === 0 && e.touches[0].pageY > 0) {
        e.preventDefault();
      }

      if (scrollTop + clientHeight >= scrollHeight && e.touches[0].pageY < 0) {
        e.preventDefault();
      }
    };

    document.addEventListener('touchmove', preventPullToRefresh, { passive: false });
    document.addEventListener('touchmove', preventElasticScroll, { passive: false });

    return () => {
      document.removeEventListener('touchmove', preventPullToRefresh);
      document.removeEventListener('touchmove', preventElasticScroll);
    };
  }, []);

  return null;
}