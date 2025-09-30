'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { User as AppUser } from '@/types';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: AppUser | null;
  supabaseUser: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // PWA Debug: Check if running in standalone mode
    const isStandalone = (window.navigator as any).standalone || window.matchMedia('(display-mode: standalone)').matches;
    console.log('🔍 PWA Debug - Running mode:', {
      isStandalone,
      userAgent: navigator.userAgent,
      displayMode: window.matchMedia('(display-mode: standalone)').matches ? 'standalone' : 'browser'
    });

    // Safety timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      console.warn('⚠️ Auth loading timeout - forcing loading to false');
      setLoading(false);
    }, 10000); // 10 second timeout

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      clearTimeout(loadingTimeout);
      console.log('🔍 PWA Debug - Initial session check:', {
        hasSession: !!session,
        userEmail: session?.user?.email,
        isStandalone
      });

      if (session?.user) {
        setSupabaseUser(session.user);
        loadUserProfile(session.user);
      } else {
        setLoading(false);
      }
    }).catch((error) => {
      clearTimeout(loadingTimeout);
      console.error('❌ Error getting initial session:', error);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      const isStandalone = (window.navigator as any).standalone || window.matchMedia('(display-mode: standalone)').matches;

      console.log('🔄 Auth state changed:', {
        event,
        userEmail: session?.user?.email,
        hasSession: !!session,
        sessionId: session?.access_token?.substring(0, 20) + '...' || 'none',
        isStandalone
      });

      if (session?.user) {
        console.log('✅ Session found, setting Supabase user and loading profile...');
        setSupabaseUser(session.user);
        await loadUserProfile(session.user);
      } else {
        console.log('❌ No session, clearing user state...');

        // Show PWA-specific message for session loss
        if (event === 'SIGNED_OUT' && isStandalone) {
          toast('Vui lòng đăng nhập lại trong PWA app', {
            icon: '🔐',
            duration: 4000
          });
        }

        setSupabaseUser(null);
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserProfile = async (supabaseUser: User) => {
    try {
      setLoading(true);
      console.log('🚀 Starting loadUserProfile for:', supabaseUser.email);
      console.log('📋 Supabase user data:', {
        id: supabaseUser.id,
        email: supabaseUser.email,
        user_metadata: supabaseUser.user_metadata,
        created_at: supabaseUser.created_at
      });

      // Check if user exists in our users table
      console.log('🔍 Checking if user exists in database...');
      const { data: existingUser, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', supabaseUser.id)
        .single();

      console.log('📊 Database query result:', {
        existingUser,
        error: error ? {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        } : null
      });

      if (error && error.code !== 'PGRST116') { // PGRST116 = not found
        console.error('❌ Critical database error:', error);
        throw new Error(`Database query failed: ${error.message}`);
      }

      if (existingUser) {
        console.log('✅ Found existing user, setting user state');
        setUser(existingUser);

        // Check if we've already shown welcome for this session
        const welcomeKey = `welcome_shown_${supabaseUser.id}`;
        const hasShownWelcome = sessionStorage.getItem(welcomeKey);

        if (!hasShownWelcome) {
          toast.success(`Chào mừng trở lại, ${existingUser.name}!`);
          sessionStorage.setItem(welcomeKey, 'true');
        }
      } else {
        console.log('👤 User not found, creating new user profile...');

        // Create new user profile
        const newUser: Partial<AppUser> = {
          id: supabaseUser.id,
          email: supabaseUser.email!,
          name: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || supabaseUser.email!,
          picture: supabaseUser.user_metadata?.avatar_url || supabaseUser.user_metadata?.picture,
          google_id: supabaseUser.user_metadata?.provider_id || supabaseUser.user_metadata?.sub,
          role: 'user'
        };

        console.log('📝 New user data to insert:', newUser);

        const { data: createdUser, error: createError } = await supabase
          .from('users')
          .insert([newUser])
          .select()
          .single();

        console.log('💾 User creation result:', {
          createdUser,
          createError: createError ? {
            message: createError.message,
            code: createError.code,
            details: createError.details,
            hint: createError.hint
          } : null
        });

        if (createError) {
          console.error('❌ User creation failed:', createError);
          throw new Error(`Failed to create user: ${createError.message}`);
        }

        console.log('✅ User created successfully, setting user state');
        setUser(createdUser);

        // Check if we've already shown welcome for this session
        const welcomeKey = `welcome_shown_${supabaseUser.id}`;
        const hasShownWelcome = sessionStorage.getItem(welcomeKey);

        if (!hasShownWelcome) {
          toast.success('Chào mừng bạn đến với Kiểm kê tài sản!');
          sessionStorage.setItem(welcomeKey, 'true');
        }
      }
    } catch (error) {
      console.error('💥 Error in loadUserProfile:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('💥 Full error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: errorMessage,
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });
      toast.error(`Lỗi tải thông tin người dùng: ${errorMessage}`);
    } finally {
      console.log('🏁 Finished loadUserProfile, setting loading to false');
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    try {
      setLoading(true);

      // Determine redirect URL based on current path
      const currentPath = window.location.pathname;
      const redirectTo = currentPath.startsWith('/admin')
        ? `${window.location.origin}/admin`
        : `${window.location.origin}/assets`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error signing in with Google:', error);
      toast.error('Lỗi đăng nhập với Google');
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      setUser(null);
      setSupabaseUser(null);
      toast.success('Đã đăng xuất thành công');

      // Redirect to login page
      window.location.href = '/';
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Lỗi đăng xuất');
    }
  };

  const refreshSession = async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) throw error;

      console.log('🔄 Session refreshed successfully');
      return data.session;
    } catch (error) {
      console.error('Error refreshing session:', error);
      throw error;
    }
  };

  const value = {
    user,
    supabaseUser,
    loading,
    signInWithGoogle,
    signOut,
    refreshSession
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
