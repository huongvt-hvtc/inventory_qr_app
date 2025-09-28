// NEW Email-based License System Types

export interface License {
  id: string;
  owner_email: string; // Primary license owner

  // Subscription Details
  plan_type: 'basic' | 'pro' | 'max' | 'enterprise';
  valid_from: string;
  valid_until: string;
  status: 'active' | 'expired' | 'suspended';

  // Plan Limits
  max_companies: number;
  max_users: number;
  max_assets: number;
  max_members: number; // Total members allowed in license

  // Current Usage
  current_companies: number;
  current_users: number;
  current_assets: number;
  current_members: number;

  // Billing
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

  // Relations
  companies?: Company[];
  members?: LicenseMember[];
}

// Legacy interface for backward compatibility
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
  license_id: string; // Points to License.id instead of license_key_id
  email: string;
  role: 'owner' | 'member';
  status: 'active' | 'pending' | 'inactive';
  invited_by?: string;
  invited_at: string;
  joined_at?: string;
  last_active_at?: string;

  // Relations
  company_permissions?: CompanyPermission[];
}

export interface Company {
  id: string;
  name: string;
  license_id: string; // Every company belongs to a license
  created_by: string; // User who created the company
  created_at: string;
  updated_at: string;

  // Relations
  license?: License;
  permissions?: CompanyPermission[];
}

// New interface for granular company-member permissions
export interface CompanyPermission {
  id: string;
  company_id: string;
  license_member_id: string;
  role: 'admin' | 'member' | 'viewer';
  granted_by: string; // License owner who granted this permission
  granted_at: string;

  // Relations
  company?: Company;
  member?: LicenseMember;
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

// NEW License Creation Requests (for admin)
export interface LicenseCreationRequest {
  owner_email: string;
  plan_type: 'basic' | 'pro' | 'max' | 'enterprise';
  valid_from: string;
  valid_until: string;
  max_members: number;  // Số email được dùng chung
  max_companies: number; // Số danh sách tài sản (công ty) được tạo
  price: number; // Giá tiền
  notes?: string;
}

export interface LicenseCreationResponse {
  success: boolean;
  error?: string;
  license_id?: string;
}

// Company Creation in Settings
export interface CompanyCreationRequest {
  name: string;
  license_id: string;
}

export interface CompanyCreationResponse {
  success: boolean;
  error?: string;
  company_id?: string;
}

// Member Invitation
export interface MemberInvitationRequest {
  license_id: string;
  email: string;
  company_permissions: {
    company_id: string;
    role: 'admin' | 'member' | 'viewer';
  }[];
}

export interface MemberInvitationResponse {
  success: boolean;
  error?: string;
  member_id?: string;
}

// Legacy interfaces for backward compatibility
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
    id: string;
    owner_email: string;
    plan_type: string;
    valid_until: string;
    status: string;
    max_members: number;
    max_companies: number;
    max_users: number;
    max_assets: number;
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
    members: {
      current: number;
      max: number;
    };
  };
  companies: Company[];
  members: LicenseMember[];
}

// Legacy interface for backward compatibility
export interface LegacyLicenseUsageInfo {
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
  max_members: number; // Changed from max_emails to max_members
  features: string[];
  price_vnd: number;
  price_display: string;
}

export const SUBSCRIPTION_PLANS: Record<string, PlanLimits> = {
  basic: {
    max_companies: 3, // Increased for multi-company support
    max_users: 999,
    max_assets: 99999,
    max_members: 1, // Basic: 1 member total (owner only)
    features: ['1 member', '3 công ty', 'Quản lý tài sản không giới hạn', 'QR code generation', 'Basic support'],
    price_vnd: 5000000,
    price_display: '5,000,000 VNĐ/năm'
  },
  pro: {
    max_companies: 5, // Pro allows more companies
    max_users: 999,
    max_assets: 99999,
    max_members: 5, // Pro: 5 members total
    features: ['5 members', '5 công ty', 'Phân quyền chi tiết', 'Excel export', 'API access', 'Priority support'],
    price_vnd: 12000000,
    price_display: '12,000,000 VNĐ/năm'
  },
  max: {
    max_companies: 10, // Max allows even more companies
    max_users: 999,
    max_assets: 99999,
    max_members: 10, // Max: 10 members total
    features: ['10 members', '10 công ty', 'Advanced reporting', 'Custom fields', 'Team collaboration', 'Premium support'],
    price_vnd: 25000000,
    price_display: '25,000,000 VNĐ/năm'
  },
  enterprise: {
    max_companies: 999, // Enterprise: unlimited companies
    max_users: 999,
    max_assets: 99999,
    max_members: 999, // Enterprise: Unlimited members
    features: ['Không giới hạn members', 'Không giới hạn công ty', '24/7 support', 'Custom features', 'White-label', 'Dedicated manager'],
    price_vnd: 50000000,
    price_display: '50,000,000 VNĐ/năm'
  }
};