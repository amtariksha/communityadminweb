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

  // Batch 14 — purchase-request approval configuration. Keep in sync
  // with communityos/packages/shared/src/types/tenant.ts.
  pr_approval_levels?: number;
  pr_approval_roles?: string[];
  pr_approval_threshold?: number;

  // Batch 15 — automated monthly report email digest. Fires via the
  // backend's BullMQ cron and is enforced per tenant by
  // ScheduledReportsService. Keep in sync with
  // communityos/packages/shared/src/types/tenant.ts.
  scheduled_reports?: {
    enabled?: boolean;
    reports?: Array<
      'trial_balance' | 'income_expenditure' | 'defaulters' | 'collection_summary'
    >;
    recipients?: string[];
    day_of_month?: number;
    time_of_day?: string;
  };
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
  /**
   * QA #28 — Optimistic lock counter. Backend auto-increments on every
   * UPDATE (migration 047 trigger). Admin-web should echo it back on
   * PATCH /tenants/:id/settings as `expected_row_version` to detect
   * concurrent modifications; server replies 409 on mismatch.
   */
  row_version?: number;
  created_at: Date;
  updated_at: Date;
}
