'use client';

import React, { useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import LicenseManagement from '@/components/admin/LicenseManagement';
import AdminGuide from '@/components/admin/AdminGuide';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('licenses');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'licenses':
        return <LicenseManagement />;
      case 'guide':
        return <AdminGuide />;
      default:
        return <LicenseManagement />;
    }
  };

  return (
    <AdminLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderTabContent()}
    </AdminLayout>
  );
}