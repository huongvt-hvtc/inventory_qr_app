import { useAuth } from '@/contexts/AuthContext';

export function useAdminAccess() {
  const { user } = useAuth();

  // List of admin emails - you can expand this list as needed
  const adminEmails = [
    'mr.ngoctmn@gmail.com',
    // Add more admin emails here as needed
  ];

  const isAdmin = user?.email ? adminEmails.includes(user.email) : false;

  return {
    isAdmin,
    adminEmails,
    userEmail: user?.email
  };
}