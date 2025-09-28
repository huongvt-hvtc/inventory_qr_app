'use client';

import React, { useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import AdminDashboard from '@/components/admin/AdminDashboard';
import EmailLicenseManagement from '@/components/admin/EmailLicenseManagement';
import AdminGuide from '@/components/admin/AdminGuide';
import AdminSettings from '@/components/admin/AdminSettings';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <AdminDashboard />;
      case 'licenses':
        return <EmailLicenseManagement />;
      case 'guide':
        return <AdminGuide />;
      case 'settings':
        return <AdminSettings />;
      default:
        return <AdminDashboard />;
    }
  };

  return (
    <AdminLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderTabContent()}
    </AdminLayout>
  );
}