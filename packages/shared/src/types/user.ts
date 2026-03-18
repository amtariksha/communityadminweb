export interface User {
  id: string;
  phone: string;
  name: string;
  email: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface UserTenantRole {
  id: string;
  user_id: string;
  tenant_id: string;
  role_id: string;
  unit_id: string | null;
  is_primary: boolean;
}

export interface JwtPayload {
  /** User ID */
  sub: string;
  phone: string;
  tenants: Array<{
    tenant_id: string;
    tenant_name: string;
    /** Role slugs assigned for this tenant */
    roles: string[];
  }>;
}

export interface AuthenticatedUser {
  id: string;
  phone: string;
  name: string;
  current_tenant_id: string;
  roles: string[];
}
