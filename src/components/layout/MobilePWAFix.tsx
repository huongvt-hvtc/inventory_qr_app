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

    // Only prevent pull-to-refresh at the very top of the page
    // Allow normal scrolling everywhere else
    const preventPullToRefresh = (e: TouchEvent) => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const touchY = e.touches[0].clientY;

      // Only prevent pull-to-refresh if:
      // 1. We're at the very top of the page (scrollTop === 0)
      // 2. The user is scrolling down from the top (touchY is moving down)
      // 3. The touch is in the upper portion of the screen (not in scrollable content)
      if (scrollTop === 0 && touchY < 100) {
        const target = e.target as Element;
        // Don't prevent if the target is inside a scrollable container
        if (!target.closest('.overflow-auto, .overflow-y-auto, [data-scroll="true"]')) {
          e.preventDefault();
        }
      }
    };

    // Add event listener with passive: false only for the specific pull-to-refresh case
    document.addEventListener('touchstart', preventPullToRefresh, { passive: false });

    return () => {
      document.removeEventListener('touchstart', preventPullToRefresh);
    };
  }, []);

  return null;
}