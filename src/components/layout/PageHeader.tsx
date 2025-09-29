'use client';

import React from 'react';
import CompanySwitcher from '@/components/navigation/CompanySwitcher';
import { useCompany } from '@/contexts/CompanyContext';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  showCompanySwitcher?: boolean;
}

export default function PageHeader({
  title,
  description,
  actions,
  showCompanySwitcher = true
}: PageHeaderProps) {
  const { setCurrentCompany } = useCompany();

  return (
    <div className="mb-6 space-y-4">
      {/* Company Switcher - Show on mobile only since desktop has it in sidebar */}
      {showCompanySwitcher && (
        <div className="block md:hidden mb-4">
          <CompanySwitcher
            onCompanyChange={setCurrentCompany}
            showCreateButton={false}
          />
        </div>
      )}

      {/* Page Title and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-gray-900 truncate">
            {title}
          </h1>
          {description && (
            <p className="text-gray-600 text-sm sm:text-base mt-1">
              {description}
            </p>
          )}
        </div>

        {actions && (
          <div className="flex-shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}