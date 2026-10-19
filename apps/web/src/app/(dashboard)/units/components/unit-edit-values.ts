import { area2Error } from './unit-billing-fields';

/**
 * View/Edit Unit details (UNIT-16, screen UNIT-S6): every field PATCH
 * /units/:id holds, as the form edits them, and the body a save sends (only
 * what changed). Maintenance amount and rates are left out (decision
 * UNIT-D13: no billing code reads them).
 */

export interface UnitRecord {
  id: string;
  unit_number: string;
  block?: string | null;
  floor: number;
  area_sqft: number | string;
  unit_type: string;
  is_active: boolean;
  apartment_number?: string | null;
  bhk_type?: string | null;
  garden_area?: number | string | null;
  occupancy_status?: string | null;
  intercom?: string | null;
  meter_number?: string | null;
  meter_in_owner_name?: boolean | null;
  khata_in_owner_name?: boolean | null;
  previous_owner?: string | null;
  transfer_amount_received?: boolean | null;
  parking_slot?: string | null;
  member_category_id?: string | null;
  billing_category_id?: string | null;
}

/** Yes / No answers: '' = not answered. */
export type YesNo = '' | 'yes' | 'no';

export interface UnitEditValues {
  unit_number: string;
  block: string;
  floor: string;
  area_sqft: string;
  unit_type: string;
  is_active: boolean;
  apartment_number: string;
  bhk_type: string;
  garden_area: string;
  occupancy_status: string;
  intercom: string;
  meter_number: string;
  meter_in_owner_name: YesNo;
  khata_in_owner_name: YesNo;
  previous_owner: string;
  transfer_amount_received: YesNo;
  member_category_id: string;
  billing_category_id: string;
}

const text = (value: string | number | null | undefined): string => (value === null || value === undefined ? '' : String(value));
const yesNo = (value: boolean | null | undefined): YesNo => (value === true ? 'yes' : value === false ? 'no' : '');

export function unitEditValues(unit: UnitRecord): UnitEditValues {
  return {
    unit_number: unit.unit_number,
    block: text(unit.block),
    floor: text(unit.floor),
    area_sqft: text(Number(unit.area_sqft)),
    unit_type: unit.unit_type,
    is_active: unit.is_active,
    apartment_number: text(unit.apartment_number),
    bhk_type: text(unit.bhk_type),
    garden_area: unit.garden_area === null || unit.garden_area === undefined ? '' : String(Number(unit.garden_area)),
    occupancy_status: text(unit.occupancy_status),
    intercom: text(unit.intercom),
    meter_number: text(unit.meter_number),
    meter_in_owner_name: yesNo(unit.meter_in_owner_name),
    khata_in_owner_name: yesNo(unit.khata_in_owner_name),
    previous_owner: text(unit.previous_owner),
    transfer_amount_received: yesNo(unit.transfer_amount_received),
    member_category_id: text(unit.member_category_id),
    billing_category_id: text(unit.billing_category_id),
  };
}

export type UnitEditErrors = Partial<Record<keyof UnitEditValues, string>>;

const LIMITS: ReadonlyArray<[keyof UnitEditValues, number]> = [
  ['unit_number', 20],
  ['apartment_number', 50],
  ['bhk_type', 20],
  ['intercom', 20],
  ['meter_number', 50],
  ['previous_owner', 200],
];

export function unitEditErrors(values: UnitEditValues): UnitEditErrors {
  const errors: UnitEditErrors = {};
  if (!values.unit_number.trim()) errors.unit_number = 'Unit number is required.';
  if (!values.block.trim()) errors.block = 'Block is required.';
  const floor = Number(values.floor);
  if (values.floor.trim() === '' || !Number.isInteger(floor) || floor < -5 || floor > 200) {
    errors.floor = 'Floor is a whole number from -5 to 200.';
  }
  const area = Number(values.area_sqft);
  if (!(area > 0 && area <= 100_000)) errors.area_sqft = 'Area is above 0 and at most 100,000 sq ft.';
  const garden = area2Error(values.garden_area);
  if (garden) errors.garden_area = garden;
  for (const [field, max] of LIMITS) {
    if ((values[field] as string).length > max) errors[field] = `At most ${max} characters.`;
  }
  return errors;
}

const nullable = (value: string): string | null => (value.trim() === '' ? null : value.trim());
const answer = (value: YesNo): boolean | null => (value === '' ? null : value === 'yes');

function fieldValue(field: keyof UnitEditValues, values: UnitEditValues, offersBillingType: boolean): unknown {
  switch (field) {
    case 'block':
      return values.block.trim().toUpperCase();
    case 'floor':
      return Number(values.floor);
    case 'area_sqft':
      return Number(values.area_sqft);
    case 'garden_area':
      return values.garden_area.trim() === '' ? null : Number(values.garden_area);
    case 'unit_type':
    case 'is_active':
      return values[field];
    case 'meter_in_owner_name':
    case 'khata_in_owner_name':
    case 'transfer_amount_received':
      return answer(values[field]);
    case 'billing_category_id':
      return offersBillingType ? nullable(values.billing_category_id) : undefined;
    case 'unit_number':
      return values.unit_number.trim();
    default:
      return nullable(values[field] as string);
  }
}

/** The PATCH /units/:id body: the changed fields only. */
export function unitEditChanges(initial: UnitEditValues, values: UnitEditValues, offersBillingType = true): Record<string, unknown> {
  const changes: Record<string, unknown> = {};
  for (const field of Object.keys(values) as Array<keyof UnitEditValues>) {
    if (values[field] === initial[field]) continue;
    const value = fieldValue(field, values, offersBillingType);
    if (value !== undefined) changes[field] = value;
  }
  return changes;
}
