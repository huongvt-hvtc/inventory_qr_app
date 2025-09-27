import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

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

      try {
        // Check if user is in admin_users table
        const { data, error } = await supabase
          .from('admin_users')
          .select('email, role')
          .eq('email', user.email)
          .single();

        if (error) {
          console.log('❌ Error checking admin status:', error);
          setIsAdmin(false);
        } else if (data) {
          console.log('✅ User is admin:', data);
          setIsAdmin(true);
        } else {
          console.log('❌ User not found in admin_users table');
          setIsAdmin(false);
        }
      } catch (error) {
        console.error('❌ Exception checking admin access:', error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    }

    checkAdminAccess();
  }, [user, authLoading]);

  return { isAdmin, loading: loading || authLoading };
}