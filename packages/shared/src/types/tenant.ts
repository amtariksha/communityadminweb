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

  // NotifPlan §"Phase 5" — per-tenant notification policy. Two
  // levers, both optional so an unset tenant continues to behave as
  // it did before this field existed:
  //
  // 1. `allow_urgent_for[]` whitelists which categories may be sent
  //    with urgency='urgent'. Empty / undefined = ALL categories may
  //    be sent urgent (legacy behaviour). Non-empty = the urgent
  //    toggle is rejected by the backend for any category not in
  //    the list, even if the admin's role would otherwise allow it.
  //
  // 2. `default_quiet_hours` — applied to a new resident's user row
  //    on create. Existing residents keep their personal settings.
  //    Set to null to opt the tenant out of seeding new residents
  //    with a quiet window.
  notification_policy?: {
    allow_urgent_for?: string[];
    default_quiet_hours?: {
      start: string; // 'HH:MM' 24h
      end: string;   // 'HH:MM' 24h
      tz: string;    // IANA, e.g. 'Asia/Kolkata'
    } | null;
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
