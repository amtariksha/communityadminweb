export interface TenantSettings {
  ev_module?: boolean;
  ai_accounting?: boolean;
  document_vault?: boolean;
  gate_module?: boolean;
  helpdesk_module?: boolean;
  digital_voting?: boolean;
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
