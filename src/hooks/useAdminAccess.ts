import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
const FALLBACK_ADMIN_EMAILS = new Set([
  'mr.ngoctmn@gmail.com',
  'huongvt.hvtc@gmail.com',
  'vietnambusinessportal@gmail.com'
]);

export function useAdminAccess() {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAdminAccess() {
      console.log('🔍 Checking admin access for user:', user?.email);

      if (authLoading) {
        console.log('⏳ Auth still loading...');
        return;
      }

      if (!user?.email) {
        console.log('❌ No user email found');
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      const hasAdminRole = user.role === 'admin';
      const isFallbackAdmin = FALLBACK_ADMIN_EMAILS.has(user.email.toLowerCase());

      if (hasAdminRole || isFallbackAdmin) {
        console.log('✅ User recognised as admin');
        setIsAdmin(true);
      } else {
        console.log('❌ User is not admin');
        setIsAdmin(false);
      }

      setLoading(false);
    }

    checkAdminAccess();
  }, [user, authLoading]);

  return { isAdmin, loading: loading || authLoading };
}
