'use client';

import { useEffect } from 'react';
import { supabasePing } from '@/lib/supabase-ping';

/**
 * Component that starts the Supabase auto-ping functionality
 * to prevent project from being paused due to inactivity
 */
export default function SupabasePingProvider() {
  useEffect(() => {
    // Start auto-ping when app loads
    supabasePing.start();

    // Cleanup on unmount
    return () => {
      supabasePing.stop();
    };
  }, []);

  // Show ping info in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const pingInfo = supabasePing.getLastPingInfo();
      if (pingInfo.lastPing) {
        console.log(`🏓 Supabase: Last ping was ${pingInfo.daysSinceLastPing} days ago`);
      } else {
        console.log('🏓 Supabase: No previous ping found, will ping soon');
      }
    }
  }, []);

  // This component doesn't render anything
  return null;
}