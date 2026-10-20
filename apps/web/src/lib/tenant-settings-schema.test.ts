import { describe, expect, it } from 'vitest';
import { billingNumberingSchema, scheduledReportsSchema, updateTenantSchema } from '@communityos/shared';

/**
 * The shared copy of the society update body. PATCH /tenants/:id dropped
 * `scheduled_reports` (not declared); the legacy feature flags it declared
 * are read by nothing and are gone.
 */
describe('updateTenantSchema settings_json', () => {
  const digest = {
    enabled: true,
    reports: ['trial_balance', 'defaulters'] as const,
    recipients: ['treasurer@example.com'],
    day_of_month: 5,
    time_of_day: '14:00',
    last_sent_period: '2026-10',
  };

  it('keeps the monthly digest whole', () => {
    expect(updateTenantSchema.parse({ settings_json: { scheduled_reports: digest } })).toEqual({
      settings_json: { scheduled_reports: digest },
    });
  });

  it('rejects a digest the API would refuse', () => {
    expect(scheduledReportsSchema.safeParse({ day_of_month: 29 }).success).toBe(false);
    expect(scheduledReportsSchema.safeParse({ last_sent_period: '2026-13' }).success).toBe(false);
  });

  it('keeps the gateway setting and leaves documents and numbering to their own routes (INC-39 – INC-43)', () => {
    const parsed = updateTenantSchema.parse({
      settings_json: {
        billing_documents: { title_with_gst: 'TAX INVOICE', show_last_receipts: 3 },
        billing_numbering: { member_invoice: { prefix: 'MF/', pad: 4 } },
        billing_gateway: { absorb_min_amount: 5000 },
      },
    });
    expect(parsed).toEqual({ settings_json: { billing_gateway: { absorb_min_amount: 5000 } } });
    expect(billingNumberingSchema.safeParse({ member_invoice: { prefix: 'TOO-LONG-PREFIX', pad: 4 } }).success).toBe(false);
  });

  it('no longer carries the legacy feature flags', () => {
    const parsed = updateTenantSchema.parse({
      settings_json: { ev_module: true, gate_module: true, digital_voting: true },
    });

    expect(parsed).toEqual({ settings_json: {} });
  });

  it('keeps the violation notification switch (RULE-07)', () => {
    const settings = { violations: { notify_residents: true } };
    expect(updateTenantSchema.parse({ settings_json: settings })).toEqual({ settings_json: settings });
  });
});
