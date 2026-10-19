import { describe, expect, it } from 'vitest';
import { scheduledReportsSchema, updateTenantSchema } from '@communityos/shared';

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

  it('no longer carries the legacy feature flags', () => {
    const parsed = updateTenantSchema.parse({
      settings_json: { ev_module: true, gate_module: true, digital_voting: true },
    });

    expect(parsed).toEqual({ settings_json: {} });
  });
});
