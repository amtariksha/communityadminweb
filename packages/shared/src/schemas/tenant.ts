import { z } from 'zod';

const tenantSettingsSchema = z.object({
  ev_module: z.boolean().optional(),
  ai_accounting: z.boolean().optional(),
  document_vault: z.boolean().optional(),
  gate_module: z.boolean().optional(),
  helpdesk_module: z.boolean().optional(),
  digital_voting: z.boolean().optional(),
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
