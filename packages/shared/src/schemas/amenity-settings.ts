import { z } from 'zod';

/**
 * Mirrors communityos packages/shared/src/schemas/amenity-settings.ts.
 *
 * Amenity & Event › Setup › Restrictions (AMEN-41), kept in
 * `tenants.settings_json.amenity_settings` and read and written through
 * GET / PATCH /tenant-settings/amenity.
 *
 * - block_defaulters: a resident whose flat has a posted bill past its due
 *   date with something left to pay cannot reserve an amenity. Read by
 *   POST /amenities/bookings (403 `booking_blocked_dues`).
 * - restrict_owner_when_tenanted: an owner (or owner's family) of a flat
 *   with a current tenant cannot reserve. Read by POST /amenities/bookings
 *   (403 `booking_blocked_owner_tenanted`).
 *
 * The society's admins booking for a resident are never limited.
 *
 * Setup › Notifications (AMEN-45), `amenity_settings.notifications`: one
 * switch per booking event we send, and whether those notices also go by
 * e-mail. Everything new is off until a community admin switches it on;
 * `booking_confirmed` (the push we always sent) stays on.
 *  - booking_confirmed: "Booking confirmed" to the flat (push + inbox).
 *  - awaiting_payment: a booking with a charge was made — what to pay, by when.
 *  - payment_reminder: a day before an unpaid booking is cancelled.
 *  - auto_cancelled: the amenity job cancelled an unpaid booking.
 *  - cancelled_by_society: an admin cancelled the booking.
 *  - email: the switched-on notices also go to the booker's e-mail.
 * Readers: amenity/amenity-notifier.ts (and booking-announce.ts). No SMS
 * switch: there is no registered SMS template for these yet.
 */
export const AMENITY_SETTINGS_DEFAULTS = {
  block_defaulters: false,
  restrict_owner_when_tenanted: false,
} as const;

export const AMENITY_NOTIFICATION_DEFAULTS = {
  booking_confirmed: true,
  awaiting_payment: false,
  payment_reminder: false,
  auto_cancelled: false,
  cancelled_by_society: false,
  email: false,
} as const;

export type AmenityNotificationKey = keyof typeof AMENITY_NOTIFICATION_DEFAULTS;

export const amenityNotificationsSchema = z.object({
  booking_confirmed: z.boolean(),
  awaiting_payment: z.boolean(),
  payment_reminder: z.boolean(),
  auto_cancelled: z.boolean(),
  cancelled_by_society: z.boolean(),
  email: z.boolean(),
});

export const amenitySettingsSchema = z.object({
  block_defaulters: z.boolean(),
  restrict_owner_when_tenanted: z.boolean(),
  notifications: amenityNotificationsSchema,
});

/** What `settings_json.amenity_settings` may hold (every key optional). */
export const storedAmenitySettingsSchema = z.object({
  block_defaulters: z.boolean().optional(),
  restrict_owner_when_tenanted: z.boolean().optional(),
  notifications: amenityNotificationsSchema.partial().optional(),
});

/** A PATCH names one or more settings (or switches); the others keep their stored value. */
export const updateAmenitySettingsSchema = storedAmenitySettingsSchema.refine(
  (value) => Object.keys(value).length > 0 && (!value.notifications || Object.keys(value.notifications).length > 0),
  { message: 'Name at least one amenity setting' },
);

export type AmenitySettings = z.infer<typeof amenitySettingsSchema>;
export type AmenityNotifications = z.infer<typeof amenityNotificationsSchema>;
export type UpdateAmenitySettingsInput = z.infer<typeof updateAmenitySettingsSchema>;

const objectOf = (value: unknown): Record<string, unknown> =>
  (value && typeof value === 'object' && !Array.isArray(value) ? value : {}) as Record<string, unknown>;

/** Stored settings over the defaults, each key read on its own. */
export function amenitySettingsFrom(stored: unknown): AmenitySettings {
  const saved = objectOf(stored);
  const flag = (key: keyof typeof AMENITY_SETTINGS_DEFAULTS): boolean =>
    typeof saved[key] === 'boolean' ? (saved[key] as boolean) : AMENITY_SETTINGS_DEFAULTS[key];
  const switches = objectOf(saved.notifications);
  const notifications = Object.fromEntries(
    (Object.keys(AMENITY_NOTIFICATION_DEFAULTS) as AmenityNotificationKey[]).map((key) => [
      key,
      typeof switches[key] === 'boolean' ? switches[key] : AMENITY_NOTIFICATION_DEFAULTS[key],
    ]),
  ) as AmenityNotifications;
  return {
    block_defaulters: flag('block_defaulters'),
    restrict_owner_when_tenanted: flag('restrict_owner_when_tenanted'),
    notifications,
  };
}

/** The settings after a change: the switches merge one by one. */
export function mergeAmenitySettings(current: AmenitySettings, change: UpdateAmenitySettingsInput): AmenitySettings {
  return {
    block_defaulters: change.block_defaulters ?? current.block_defaulters,
    restrict_owner_when_tenanted: change.restrict_owner_when_tenanted ?? current.restrict_owner_when_tenanted,
    notifications: { ...current.notifications, ...(change.notifications ?? {}) },
  };
}
