'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('🔄 Handling auth callback...');

        // Exchange the code for a session
        const { data, error } = await supabase.auth.exchangeCodeForSession(window.location.href);

        if (error) {
          console.error('❌ Auth callback error:', error);
          // Clear URL and redirect to login with error
          window.history.replaceState({}, document.title, '/login');
          router.replace('/login?error=auth_failed');
          return;
        }

        if (data.session) {
          console.log('✅ Authentication successful!');

          // Clear the URL of any auth tokens/codes by replacing the current history entry
          window.history.replaceState({}, document.title, '/auth/callback');

          // Small delay to let the auth context update
          setTimeout(() => {
            router.replace('/assets');
          }, 100);
        } else {
          console.log('❌ No session found, redirecting to login...');
          window.history.replaceState({}, document.title, '/login');
          router.replace('/login');
        }
      } catch (error) {
        console.error('💥 Error in auth callback:', error);
        window.history.replaceState({}, document.title, '/login');
        router.replace('/login?error=callback_failed');
      }
    };

    // Small delay to ensure URL is fully loaded
    const timer = setTimeout(handleAuthCallback, 100);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
        <h2 className="text-xl font-semibold text-gray-900">Đang xác thực...</h2>
        <p className="text-gray-600">Vui lòng đợi trong giây lát</p>
      </div>
    </div>
  );
}