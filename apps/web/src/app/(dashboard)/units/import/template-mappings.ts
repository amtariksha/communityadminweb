import type { CsvImportRow } from '@/hooks';
import { BRAND } from '@/config/branding';

/** Source app identifiers */
export type ImportSource = 'adda' | 'nobroker' | 'mygate' | 'apnacomplex' | 'custom';

export interface TemplateInfo {
  id: ImportSource;
  name: string;
  description: string;
  sampleColumns: string[];
}

export const TEMPLATES: TemplateInfo[] = [
  {
    id: 'adda',
    name: 'ADDA',
    description: 'Import from ADDA (TheApartmentApp). Supports the standard unit export format with owner/tenant details, maintenance rates, meter info, and Khata details.',
    sampleColumns: [
      'SL.NO', 'Block', 'Unit', 'Type of Apartment', 'Previous Owner',
      'Current Owner', 'Trf Amount Rcvd Y/N', 'Email', 'Phone',
      'Sq Ft 1', 'Sq Ft 2', 'Rate-1', 'Rate-2', 'Maintenance',
      'Rented / Self Occupied/ Empty', 'Apartment #', 'Issue Date (DD/MM/YYYY)',
      'Tenant Name', 'Contact details', 'VALID TILL',
      'House Occupancy', 'Guests staying', 'Non Indian Residents',
      'Passport Copy/Aadhaar No', 'Pan No', 'Meter Number',
      'Meter in owner name', 'Khata in owner name',
    ],
  },
  {
    id: 'nobroker',
    name: 'NoBroker Society',
    description: 'Import from NoBrokerHood. Supports wing, flat number, owner/tenant details, area, and bedroom count.',
    sampleColumns: [
      'Wing', 'Flat Number', 'Owner Name', 'Owner Phone', 'Owner Email',
      'Tenant Name', 'Tenant Phone', 'Sq Ft', 'Number of Bedrooms',
      'Occupancy Status', 'Parking Slot',
    ],
  },
  {
    id: 'mygate',
    name: 'MyGate',
    description: 'Import from MyGate. Supports building/flat details, resident info, and occupancy status.',
    sampleColumns: [
      'Building Name', 'Flat Number', 'Flat Type', 'Name', 'User Type',
      'Contact Details', 'Email ID', 'Occupancy Status', 'Active/Inactive',
    ],
  },
  {
    id: 'apnacomplex',
    name: 'ApnaComplex',
    description: 'Import from ApnaComplex (Anacity). Supports block, unit, BHK, area, parking, intercom, and owner details.',
    sampleColumns: [
      'Block', 'Unit No.', 'BHK', 'Super Built-up Area', 'Parking',
      'Intercom', 'Registered Owner', 'Phone', 'Email',
    ],
  },
  {
    id: 'custom',
    name: 'Custom CSV',
    description: `Upload any CSV and manually map columns to ${BRAND.appName} fields. Use this if your data is from a different app or a custom spreadsheet.`,
    sampleColumns: [],
  },
];

/**
 * Normalize a CSV header to lowercase, trimmed, with common variations handled
 */
function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
}

function parseYesNo(value: string | undefined): boolean | null {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  if (v === 'y' || v === 'yes' || v === 'true' || v === '1') return true;
  if (v === 'n' || v === 'no' || v === 'false' || v === '0') return false;
  return null;
}

function parseOccupancy(value: string | undefined): 'self_occupied' | 'rented' | 'empty' | null {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  if (v.includes('rent')) return 'rented';
  if (v.includes('self') || v.includes('occupied')) return 'self_occupied';
  if (v.includes('empty') || v.includes('vacant')) return 'empty';
  return null;
}

function parseNumber(value: string | undefined): number | null {
  if (!value) return null;
  const cleaned = value.replace(/,/g, '').trim();
  const num = Number(cleaned);
  return isNaN(num) ? null : num;
}

function parseDateDDMMYYYY(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  // DD/MM/YYYY → YYYY-MM-DD
  const match = trimmed.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (match) {
    const [, day, month, year] = match;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  // Already ISO format
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  return null;
}

/**
 * Map a raw CSV row (keyed by original headers) to our CsvImportRow format
 * based on the selected template.
 */
export function mapRowToImport(
  source: ImportSource,
  rawRow: Record<string, string>,
): CsvImportRow | null {
  // Normalize all keys
  const row: Record<string, string> = {};
  for (const [key, value] of Object.entries(rawRow)) {
    row[normalizeHeader(key)] = value?.trim() ?? '';
  }

  switch (source) {
    case 'adda':
      return mapAddaRow(row);
    case 'nobroker':
      return mapNoBrokerRow(row);
    case 'mygate':
      return mapMyGateRow(row);
    case 'apnacomplex':
      return mapApnaComplexRow(row);
    case 'custom':
      return mapCustomRow(row);
    default:
      return null;
  }
}

function mapAddaRow(row: Record<string, string>): CsvImportRow {
  const unitNumber = row['unit'] || row['unit_number'] || row['flat_no'] || '';
  const block = row['block'] || null;

  return {
    unit_number: unitNumber,
    block,
    floor: null,
    area_sqft: parseNumber(row['sq_ft_1']),
    unit_type: 'flat',
    apartment_number: row['apartment'] || row['apartment_number'] || null,
    bhk_type: row['type_of_apartment'] || null,
    garden_area: parseNumber(row['sq_ft_2']),
    occupancy_status: parseOccupancy(row['rented_self_occupied_empty']),
    maintenance_amount: parseNumber(row['maintenance']),
    maintenance_rate_1: parseNumber(row['rate_1']),
    maintenance_rate_2: parseNumber(row['rate_2']),
    meter_number: row['meter_number'] || null,
    meter_in_owner_name: parseYesNo(row['meter_in_owner_name']),
    khata_in_owner_name: parseYesNo(row['khata_in_owner_name']),
    previous_owner: row['previous_owner'] || null,
    transfer_amount_received: parseYesNo(row['trf_amount_rcvd_y_n']),
    owner_name: row['current_owner'] || null,
    owner_phone: row['phone'] || null,
    owner_email: row['email'] || null,
    owner_pan: row['pan_no'] || null,
    owner_id_proof: row['passport_copy_aadhaar_no'] || null,
    tenant_name: row['tenant_name'] || null,
    tenant_phone: row['contact_details'] || null,
    lease_end_date: parseDateDDMMYYYY(row['valid_till']),
    metadata: {
      ...(row['house_occupancy'] ? { house_occupancy: row['house_occupancy'] } : {}),
      ...(row['guests_staying'] ? { guests_staying: row['guests_staying'] } : {}),
      ...(row['non_indian_residents'] ? { non_indian_residents: row['non_indian_residents'] } : {}),
      ...(row['issue_date_dd_mm_yyyy'] ? { issue_date: parseDateDDMMYYYY(row['issue_date_dd_mm_yyyy']) } : {}),
    },
  };
}

function mapNoBrokerRow(row: Record<string, string>): CsvImportRow {
  return {
    unit_number: row['flat_number'] || row['flat_no'] || '',
    block: row['wing'] || row['tower'] || null,
    area_sqft: parseNumber(row['sq_ft'] || row['area']),
    unit_type: 'flat',
    bhk_type: row['number_of_bedrooms'] || row['bhk'] || null,
    occupancy_status: parseOccupancy(row['occupancy_status']),
    parking_slot: row['parking_slot'] || row['parking'] || null,
    owner_name: row['owner_name'] || null,
    owner_phone: row['owner_phone'] || null,
    owner_email: row['owner_email'] || null,
    tenant_name: row['tenant_name'] || null,
    tenant_phone: row['tenant_phone'] || null,
  };
}

function mapMyGateRow(row: Record<string, string>): CsvImportRow {
  const userType = (row['user_type'] || '').toLowerCase();
  const isOwner = userType.includes('owner');
  const isTenant = userType.includes('tenant');
  const name = row['name'] || '';
  const phone = row['contact_details'] || row['phone'] || '';
  const email = row['email_id'] || row['email'] || '';

  return {
    unit_number: row['flat_number'] || row['flat_no'] || '',
    block: row['building_name'] || row['building'] || null,
    unit_type: 'flat',
    bhk_type: row['flat_type'] || null,
    occupancy_status: parseOccupancy(row['occupancy_status']),
    owner_name: isOwner ? name : null,
    owner_phone: isOwner ? phone : null,
    owner_email: isOwner ? email : null,
    tenant_name: isTenant ? name : null,
    tenant_phone: isTenant ? phone : null,
    tenant_email: isTenant ? email : null,
  };
}

function mapApnaComplexRow(row: Record<string, string>): CsvImportRow {
  return {
    unit_number: row['unit_no'] || row['unit_number'] || '',
    block: row['block'] || row['tower'] || null,
    area_sqft: parseNumber(row['super_built_up_area'] || row['area']),
    unit_type: 'flat',
    bhk_type: row['bhk'] || null,
    parking_slot: row['parking'] || null,
    intercom: row['intercom'] || null,
    owner_name: row['registered_owner'] || row['owner'] || null,
    owner_phone: row['phone'] || null,
    owner_email: row['email'] || null,
  };
}

function mapCustomRow(row: Record<string, string>): CsvImportRow {
  // For custom, try common field names
  return {
    unit_number: row['unit_number'] || row['unit'] || row['flat_number'] || row['flat_no'] || row['flat'] || '',
    block: row['block'] || row['wing'] || row['tower'] || row['building'] || null,
    floor: parseNumber(row['floor']),
    area_sqft: parseNumber(row['area_sqft'] || row['area'] || row['sq_ft'] || row['sqft']),
    unit_type: 'flat',
    bhk_type: row['bhk'] || row['bhk_type'] || row['type'] || null,
    occupancy_status: parseOccupancy(row['occupancy_status'] || row['status']),
    maintenance_amount: parseNumber(row['maintenance'] || row['maintenance_amount']),
    owner_name: row['owner_name'] || row['owner'] || null,
    owner_phone: row['owner_phone'] || row['phone'] || null,
    owner_email: row['owner_email'] || row['email'] || null,
    tenant_name: row['tenant_name'] || row['tenant'] || null,
    tenant_phone: row['tenant_phone'] || null,
  };
}
