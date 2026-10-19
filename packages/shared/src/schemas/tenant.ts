import { z } from 'zod';

/**
 * The monthly report digest (REP-01). Mirrors communityos
 * packages/shared/src/schemas/tenant.ts; the save merges top-level keys
 * only, so the Automated reports card sends the object whole.
 */
export const scheduledReportsSchema = z.object({
  enabled: z.boolean().optional(),
  reports: z
    .array(z.enum(['trial_balance', 'income_expenditure', 'defaulters', 'collection_summary']))
    .optional(),
  recipients: z.array(z.string().email()).optional(),
  day_of_month: z.number().int().min(1).max(28).optional(),
  time_of_day: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'HH:MM required')
    .optional(),
  last_sent_period: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'YYYY-MM required')
    .optional(),
});

/**
 * ANN-07 — Announcements › Setup › Default channels (push always). Mirrors
 * communityos packages/shared/src/schemas/tenant.ts; written by
 * PUT /announcements/setup/channels.
 */
export const ANNOUNCEMENT_CHANNELS = ['push', 'email', 'sms_general'] as const;

export const announcementSettingsSchema = z.object({
  default_channels: z.array(z.enum(ANNOUNCEMENT_CHANNELS)).max(3).optional(),
});

export type AnnouncementSettings = z.infer<typeof announcementSettingsSchema>;

const tenantSettingsSchema = z.object({
  scheduled_reports: scheduledReportsSchema.optional(),
  announcements: announcementSettingsSchema.optional(),
});

export const createTenantSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  address: z.string().min(1, 'Address is required').max(500),
  city: z.string().min(1, 'City is required').max(100),
  state: z.string().min(1, 'State is required').max(100),
  subscription_plan: z.string().min(1, 'Subscription plan is required'),
  price_per_unit: z.number().nonnegative('Price per unit must be non-negative'),
  admin_phone: z
    .string()
    .regex(/^\+91\d{10}$/, 'Phone must be a valid Indian number in +91XXXXXXXXXX format')
    .optional(),
});

export type CreateTenantInput = z.infer<typeof createTenantSchema>;

export const updateTenantSchema = createTenantSchema.partial().extend({
  settings_json: tenantSettingsSchema.optional(),
});

export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;
