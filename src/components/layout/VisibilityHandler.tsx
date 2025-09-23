'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function VisibilityHandler() {
  const router = useRouter();
  const lastVisibilityState = useRef(document.visibilityState);
  const isReloading = useRef(false);

  useEffect(() => {
    const handleVisibilityChange = () => {
      // Prevent multiple reloads
      if (isReloading.current) return;

      const currentState = document.visibilityState;

      // Log for debugging
      console.log(`Visibility: ${lastVisibilityState.current} -> ${currentState}`);

      if (lastVisibilityState.current === 'hidden' && currentState === 'visible') {
        // Tab became visible again
        // Prevent automatic reload by Next.js
        isReloading.current = true;

        // Use router.refresh() instead of full page reload
        router.refresh();

        // Reset flag after a delay
        setTimeout(() => {
          isReloading.current = false;
        }, 1000);
      }

      lastVisibilityState.current = currentState;
    };

    // Prevent page reload on tab switch
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (document.visibilityState === 'hidden') {
        // Don't show confirmation when switching tabs
        return;
      }
      // Show confirmation only when actually closing
      if (isReloading.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    // Quick fix: Prevent reload on visibility change
    const preventReload = (e: Event) => {
      e.stopImmediatePropagation();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Add immediate prevention for tab switching
    window.addEventListener('visibilitychange', preventReload, true);
    window.addEventListener('focus', preventReload, true);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('visibilitychange', preventReload, true);
      window.removeEventListener('focus', preventReload, true);
    };
  }, [router]);

  return null;
}