import { z } from 'zod';

/**
 * Parking Setup (PARK-10, PARK-08), kept in `tenants.settings_json.parking`
 * and read and written through GET / PATCH /tenant-settings/parking.
 *
 * - residents_can_add_vehicle: a resident may register a vehicle of their own
 *   unit (it still waits for approval). Read by POST /parking/vehicles (403
 *   `parking_add_disabled` when off) and the resident apps' Add buttons.
 * - residents_can_edit_vehicle: a resident may change or remove their unit's
 *   vehicles. Read by PATCH / DELETE /parking/vehicles/:id (403
 *   `parking_edit_disabled`) and the resident apps' Remove buttons.
 * - vehicle_additional_field_label: the name of the register's extra field
 *   (e.g. "Fastag"); blank hides the column and the field. Read by the vehicle
 *   export, the admin web register and the vehicle form.
 *
 * Admins (the society's admin tier) are never limited by the two switches.
 */
export const PARKING_SETTINGS_DEFAULTS = {
  residents_can_add_vehicle: true,
  residents_can_edit_vehicle: true,
  vehicle_additional_field_label: '',
} as const;

export const parkingSettingsSchema = z.object({
  residents_can_add_vehicle: z.boolean(),
  residents_can_edit_vehicle: z.boolean(),
  vehicle_additional_field_label: z
    .string()
    .trim()
    .max(40, 'The field name is at most 40 characters'),
});

/** A PATCH names one or more settings; the others keep their stored value. */
export const updateParkingSettingsSchema = parkingSettingsSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Name at least one parking setting',
  });

export type ParkingSettings = z.infer<typeof parkingSettingsSchema>;
export type UpdateParkingSettingsInput = z.infer<typeof updateParkingSettingsSchema>;

/** Stored settings over the defaults; an unreadable value keeps its default. */
export function parkingSettingsFrom(stored: unknown): ParkingSettings {
  const saved = parkingSettingsSchema.partial().safeParse(stored ?? {});
  const known = saved.success ? saved.data : {};
  return {
    residents_can_add_vehicle: known.residents_can_add_vehicle ?? PARKING_SETTINGS_DEFAULTS.residents_can_add_vehicle,
    residents_can_edit_vehicle: known.residents_can_edit_vehicle ?? PARKING_SETTINGS_DEFAULTS.residents_can_edit_vehicle,
    vehicle_additional_field_label:
      known.vehicle_additional_field_label ?? PARKING_SETTINGS_DEFAULTS.vehicle_additional_field_label,
  };
}
