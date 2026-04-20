export interface TenantSettings {
  ev_module?: boolean;
  ai_accounting?: boolean;
  document_vault?: boolean;
  gate_module?: boolean;
  helpdesk_module?: boolean;
  digital_voting?: boolean;
  // Community-admin toggles. Keep in sync with apps/api
  // tenantSettingsSchema and admin-web featureToggles — if a key is
  // missing from the backend Zod schema, Zod will strip it on save
  // and the UI will reset it on reload.
  visitor_management?: boolean;
  maintenance_requests?: boolean;
  parking_management?: boolean;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  address: string;
  city: string;
  state: string;
  settings_json: TenantSettings;
  subscription_plan: string;
  price_per_unit: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}
