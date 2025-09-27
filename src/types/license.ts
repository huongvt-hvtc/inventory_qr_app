// License system types

export interface LicenseKey {
  id: string;
  key_code: string;
  company_name: string;
  customer_email?: string;

  // Limits
  max_companies: number;
  max_users: number;
  max_assets: number;

  // Current usage
  current_companies: number;
  current_users: number;
  current_assets: number;

  // Subscription
  plan_type: 'basic' | 'pro' | 'enterprise';
  valid_from: string;
  valid_until: string;
  status: 'active' | 'expired' | 'suspended';

  // Pricing
  price?: number;
  notes?: string;

  // Features
  features: Record<string, any>;

  // Tracking
  last_used_at?: string;
  total_api_calls: number;

  // Metadata
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  name: string;
  owner_id: string;
  license_key_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CompanyMember {
  id: string;
  company_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  invited_by?: string;
  joined_at: string;
}

export interface LicenseActivityLog {
  id: string;
  license_key_id: string;
  company_id?: string;
  action: string;
  details: Record<string, any>;
  performed_by?: string;
  performed_at: string;
}

export interface LicenseActivationRequest {
  key_code: string;
  company_name: string;
}

export interface LicenseActivationResponse {
  success: boolean;
  error?: string;
  company_id?: string;
  license_id?: string;
}

export interface LicenseUsageInfo {
  license: {
    key_code: string;
    plan_type: string;
    valid_until: string;
    status: string;
    features: Record<string, any>;
  };
  usage: {
    companies: {
      current: number;
      max: number;
    };
    users: {
      current: number;
      max: number;
    };
    assets: {
      current: number;
      max: number;
    };
  };
}

export interface PlanLimits {
  max_companies: number;
  max_users: number;
  max_assets: number;
  features: string[];
  price_vnd: number;
  price_display: string;
}

export const SUBSCRIPTION_PLANS: Record<string, PlanLimits> = {
  basic: {
    max_companies: 3,
    max_users: 50,
    max_assets: 5000,
    features: ['Basic support', 'Standard features', 'QR code generation', 'Asset tracking'],
    price_vnd: 5000000,
    price_display: '5,000,000 VNĐ/năm'
  },
  pro: {
    max_companies: 10,
    max_users: 200,
    max_assets: 20000,
    features: ['Priority support', 'Excel export', 'API access', 'Advanced reporting', 'Custom fields', 'Bulk operations'],
    price_vnd: 12000000,
    price_display: '12,000,000 VNĐ/năm'
  },
  enterprise: {
    max_companies: 999,
    max_users: 999,
    max_assets: 99999,
    features: ['24/7 support', 'Custom features', 'White-label', 'Dedicated manager', 'Custom integrations', 'Advanced analytics'],
    price_vnd: 25000000,
    price_display: '25,000,000 VNĐ/năm'
  }
};