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
  max_emails: number; // New field for email limits

  // Current usage
  current_companies: number;
  current_users: number;
  current_assets: number;
  current_emails: number; // New field for current email usage

  // Subscription
  plan_type: 'basic' | 'pro' | 'max' | 'enterprise';
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

  // License Members (optional relation)
  license_members?: LicenseMember[];
}

export interface LicenseMember {
  id: string;
  license_key_id: string;
  email: string;
  role: 'owner' | 'member';
  status: 'active' | 'pending' | 'inactive';
  invited_by?: string;
  invited_at: string;
  joined_at?: string;
  last_active_at?: string;
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
    max_emails: number;
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
  max_emails: number; // New field for email limits
  features: string[];
  price_vnd: number;
  price_display: string;
}

export const SUBSCRIPTION_PLANS: Record<string, PlanLimits> = {
  basic: {
    max_companies: 1,
    max_users: 999,
    max_assets: 99999,
    max_emails: 1, // Basic: 1 user có thể truy cập
    features: ['1 user truy cập', 'Quản lý tài sản không giới hạn', 'QR code generation', 'Basic support'],
    price_vnd: 5000000,
    price_display: '5,000,000 VNĐ/năm'
  },
  pro: {
    max_companies: 1,
    max_users: 999,
    max_assets: 99999,
    max_emails: 5, // Pro: 5 users có thể truy cập
    features: ['5 users truy cập', 'Quản lý tài sản không giới hạn', 'Excel export', 'API access', 'Priority support'],
    price_vnd: 12000000,
    price_display: '12,000,000 VNĐ/năm'
  },
  max: {
    max_companies: 1,
    max_users: 999,
    max_assets: 99999,
    max_emails: 10, // Max: 10 users có thể truy cập
    features: ['10 users truy cập', 'Quản lý tài sản không giới hạn', 'Advanced reporting', 'Custom fields', 'Premium support'],
    price_vnd: 25000000,
    price_display: '25,000,000 VNĐ/năm'
  },
  enterprise: {
    max_companies: 1,
    max_users: 999,
    max_assets: 99999,
    max_emails: 999, // Enterprise: Không giới hạn users
    features: ['Không giới hạn users', 'Quản lý tài sản không giới hạn', '24/7 support', 'Custom features', 'White-label', 'Dedicated manager'],
    price_vnd: 50000000,
    price_display: '50,000,000 VNĐ/năm'
  }
};