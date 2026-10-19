export interface TenantSettings {
  // GATE-03 — minutes inside before the overstay sweep raises an alert
  // (unset = 240). Written by PATCH /tenant-settings/gate; keep in sync with
  // communityos/packages/shared/src/types/tenant.ts.
  overstay_threshold_minutes?: number;
  // EXP-06 — GST rates offered on purchase request lines (unset = 0/5/18/40).
  gst_rate_options?: number[];
  // EXP-11 — input GST on vendor invoices claimed (input ledgers) or a cost
  // (expense head); unset = claimed only when the society has a GSTIN.
  gst_input_credit_claimable?: boolean | null;

  // Admin-web arrangement for this society: today's layout or the
  // classic menu, density and wording. Absent = standard.
  admin_layout?: 'standard' | 'classic';

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
    // REP-01 — YYYY-MM (IST) of the last automatic send, written by the
    // job. Send it back on save so a retry in that hour cannot send twice.
    last_sent_period?: string;
  };

  // INC-02 — automatic dues reminders, read by the API's daily reminder
  // job. `days`: up to four days of the month (1–31; 29–31 fall on the
  // last day of a shorter month). Send both fields on save: settings_json
  // merges top-level keys only, and the API requires both.
  billing_reminders?: {
    enabled: boolean;
    days: number[];
    /** INC-30 — the reminder text the composer and the automatic reminders start from. */
    template?: {
      reply_to?: string | null;
      from_name?: string | null;
      subject: string;
      message_html: string;
    } | null;
  };

  // INC-12 — who bears the online-payment (gateway) charge: `absorbed` = the
  // society, `pass_through` = added to what the resident pays. Percent 0-5.
  gateway_fee_mode?: 'pass_through' | 'absorbed';
  gateway_fee_percent?: number;

  // INC-11 — the society's tax registrations, printed on invoices, receipts
  // and credit notes and carried into the GSTR-1 export (null = cleared).
  gstin?: string | null;
  pan?: string | null;
  society_registration_no?: string | null;

  // INC-07 — late payment interest and the days an invoice runs before it is
  // due, read by the API's invoice, interest and PDF code. Send the whole
  // object on save (the API merges top-level keys only). Keep in sync with
  // communityos/packages/shared/src/types/tenant.ts.
  billing_interest?: {
    rate_pa: number;
    due_days: number;
    basis: 'due_date' | 'invoice_date';
    start_date?: string | null;
    hsn_sac?: string | null;
    income_account_id?: string | null;
    auto_post?: boolean;
  };

  // INC-17 — Setup › Auto Invoicing: the billing run bills from rule lines
  // per unit type once enabled. Written by PUT /billing-rules/settings.
  billing_auto_invoice?: {
    enabled: boolean;
    frequency: 'monthly' | 'quarterly' | 'half_yearly' | 'yearly';
    /** The 1st of the month the first period starts (YYYY-MM-01). */
    start_date: string | null;
    rounding: 'two_decimals' | 'whole_rupee';
    auto_post: boolean;
  };

  // INC-30 — Setup › Notifications: billing documents e-mailed (INC-31), with
  // the line break-up or not, and to whom. Setup › Defaulters: privacy switches.
  billing_notifications?: {
    email_events: Array<
      | 'invoice_posted'
      | 'receipt_posted'
      | 'credit_note_posted'
      | 'receipt_voided'
      | 'invoice_cancelled'
      | 'interest_posted'
      | 'non_member_invoice_posted'
      | 'non_member_receipt_posted'
      | 'non_member_credit_note_posted'
    >;
    attach_breakup: boolean;
    recipients: 'owners_only' | 'owners_and_tenants';
  };
  billing_defaulters?: { hide_phone: boolean; hide_email: boolean };

  // UTIL-06 — utility invoices' own interest rate, due days, start and basis
  // (unset = billing_interest). Written by PUT /utilities/settings/interest.
  utility_interest?: {
    rate_pa: number;
    due_days: number;
    basis: 'due_date' | 'invoice_date';
    start_date?: string | null;
  };
  // UTIL-07 — post a batch of utility invoices on creation (unless the
  // request says). Written by PUT /utilities/settings/billing.
  utility_billing?: {
    auto_post?: boolean;
  };

  // INC-23 — Setup › GST: whether Post Invoice offers GST on an ad-hoc
  // invoice (unset = on). Read by POST /invoices/adhoc and the form.
  billing_gst?: {
    show_on_adhoc: boolean;
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
