'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';

interface SessionInfo {
  sessionToken: string;
  deviceType: 'mobile' | 'desktop';
  deviceInfo: string;
}

interface SessionValidation {
  success: boolean;
  message?: string;
  existing_session?: {
    device_info: string;
    last_active: string;
  };
}

export function useSessionManager() {
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  // Get device type based on screen size and user agent
  const getDeviceType = (): 'mobile' | 'desktop' => {
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobile = /iphone|ipad|ipod|android|blackberry|windows phone/i.test(userAgent);
    const screenWidth = window.innerWidth;
    
    if (isMobile || screenWidth < 768) {
      return 'mobile';
    }
    return 'desktop';
  };

  // Get device info
  const getDeviceInfo = (): string => {
    const userAgent = navigator.userAgent;
    const platform = navigator.platform;
    const screenSize = `${window.innerWidth}x${window.innerHeight}`;
    
    return `${platform} - ${screenSize} - ${userAgent.substring(0, 100)}`;
  };

  // Get or create session token
  const getSessionToken = (): string => {
    const stored = localStorage.getItem('session_token');
    if (stored) return stored;
    
    const newToken = uuidv4();
    localStorage.setItem('session_token', newToken);
    return newToken;
  };

  // Validate session
  const validateSession = async (userEmail: string): Promise<boolean> => {
    setIsValidating(true);
    
    try {
      const sessionToken = getSessionToken();
      const deviceType = getDeviceType();
      const deviceInfo = getDeviceInfo();

      // Call validate function
      const { data, error } = await supabase.rpc('validate_session_limit', {
        p_user_email: userEmail,
        p_device_type: deviceType,
        p_session_token: sessionToken,
        p_device_info: deviceInfo
      });

      if (error) throw error;

      const result = data as SessionValidation;

      if (!result.success) {
        // Session conflict detected
        const confirmSwitch = await new Promise<boolean>((resolve) => {
          const deviceName = deviceType === 'mobile' ? 'điện thoại' : 'máy tính';
          
          // Create custom confirmation dialog
          const dialog = document.createElement('div');
          dialog.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50';
          dialog.innerHTML = `
            <div class="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
              <h3 class="text-lg font-semibold mb-3">⚠️ Phát hiện đăng nhập khác</h3>
              <p class="text-gray-600 mb-2">${result.message}</p>
              ${result.existing_session ? `
                <div class="bg-gray-50 p-3 rounded mb-4 text-sm text-gray-500">
                  <p><strong>Thiết bị:</strong> ${result.existing_session.device_info || 'Không xác định'}</p>
                  <p><strong>Hoạt động lần cuối:</strong> ${new Date(result.existing_session.last_active).toLocaleString('vi-VN')}</p>
                </div>
              ` : ''}
              <p class="text-gray-700 mb-6">Bạn có muốn đăng nhập và đăng xuất khỏi ${deviceName} kia không?</p>
              <div class="flex gap-3 justify-end">
                <button id="cancel-switch" class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition">
                  Hủy
                </button>
                <button id="confirm-switch" class="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition">
                  Đồng ý chuyển
                </button>
              </div>
            </div>
          `;

          document.body.appendChild(dialog);

          // Handle button clicks
          document.getElementById('cancel-switch')?.addEventListener('click', () => {
            document.body.removeChild(dialog);
            resolve(false);
          });

          document.getElementById('confirm-switch')?.addEventListener('click', () => {
            document.body.removeChild(dialog);
            resolve(true);
          });
        });

        if (confirmSwitch) {
          // Force new session
          const { data: forceData, error: forceError } = await supabase.rpc('force_new_session', {
            p_user_email: userEmail,
            p_device_type: deviceType,
            p_session_token: sessionToken,
            p_device_info: deviceInfo
          });

          if (forceError) throw forceError;

          toast.success('Đã chuyển sang thiết bị mới');
          
          setSessionInfo({
            sessionToken,
            deviceType,
            deviceInfo
          });
          
          return true;
        } else {
          // User cancelled, logout
          toast.error('Đăng nhập bị hủy');
          return false;
        }
      }

      // Session is valid
      setSessionInfo({
        sessionToken,
        deviceType,
        deviceInfo
      });

      return true;
    } catch (error) {
      console.error('Session validation error:', error);
      toast.error('Lỗi xác thực phiên đăng nhập');
      return false;
    } finally {
      setIsValidating(false);
    }
  };

  // Update session activity periodically
  useEffect(() => {
    if (!sessionInfo?.sessionToken) return;

    const updateActivity = async () => {
      try {
        await supabase.rpc('update_session_activity', {
          p_session_token: sessionInfo.sessionToken
        });
      } catch (error) {
        console.error('Error updating session activity:', error);
      }
    };

    // Update immediately
    updateActivity();

    // Update every 5 minutes
    const interval = setInterval(updateActivity, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [sessionInfo?.sessionToken]);

  // Clean up on unmount
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Mark session as inactive when closing
      if (sessionInfo?.sessionToken) {
        navigator.sendBeacon(
          '/api/session/inactive',
          JSON.stringify({ token: sessionInfo.sessionToken })
        );
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [sessionInfo?.sessionToken]);

  return {
    sessionInfo,
    isValidating,
    validateSession,
    getDeviceType
  };
}
