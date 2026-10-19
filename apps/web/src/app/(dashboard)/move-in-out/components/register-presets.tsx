import type { DataTableColumn } from '@/components/data-table';
import type { DirectoryAgreement, DirectoryFilters, DirectoryMember } from '@/hooks/use-unit-members';
import { indiaDate, indiaDateTime } from '@/lib/india-time';

/**
 * The resident registers' column presets (MOVE-08 owners and tenants,
 * MOVE-09 agreement tabs, MOVE-10 / UNIT-18 deactivated) over one list,
 * GET /units/directory/members (MOVE-07).
 */

export type RegisterPreset = 'owners' | 'tenants' | 'ending' | 'ended' | 'no_agreement' | 'deactivated' | 'deactivated_users';

type Column = DataTableColumn<DirectoryMember>;

const STATUS: Record<string, string> = { active: 'Active', never: 'Never logged in', no_account: 'No account' };
const TYPES: Record<string, string> = {
  owner: 'Owner',
  tenant: 'Tenant',
  owner_family: 'Owner Family',
  tenant_family: 'Tenant Family',
  family: 'Family',
  family_member: 'Owner Family',
};
const yn = (value: boolean | null | undefined): string => (value ? 'Y' : 'N');

export function unitLabel(row: Pick<DirectoryMember, 'block' | 'unit_number'>): string {
  if (!row.unit_number) return '—';
  if (!row.block || row.unit_number.toUpperCase().startsWith(`${row.block.toUpperCase()}-`)) return row.unit_number;
  return `${row.block}-${row.unit_number}`;
}

const UNIT: Column = { key: 'unit', header: 'Unit', cell: unitLabel, className: 'whitespace-nowrap' };
const NAME: Column = { key: 'name', header: 'Name', cell: (row) => row.name ?? '—' };
const INTERCOM: Column = { key: 'intercom', header: 'Intercom', cell: (row) => row.intercom ?? '' };
const USER_STATUS: Column = { key: 'status', header: 'User Status', cell: (row) => STATUS[row.app_status ?? ''] ?? '' };
const LIVES: Column = { key: 'lives', header: 'Lives Here', cell: (row) => yn(row.lives_here) };
const PRIMARY: Column = { key: 'primary', header: 'Primary Contact', cell: (row) => yn(row.is_primary_contact) };
const ASSOC: Column = { key: 'assoc', header: 'Assoc. Member', cell: (row) => yn(row.is_association_member) };
const lastLog = (header: string): Column => ({
  key: 'lastlog',
  header,
  cell: (row) => (row.last_login_at ? indiaDateTime(row.last_login_at) : ''),
  className: 'whitespace-nowrap',
});
const TYPE: Column = { key: 'type', header: 'Owner/Tenant', cell: (row) => TYPES[row.member_type] ?? row.member_type };
const JOINED: Column = { key: 'joined', header: 'Joined On', cell: (row) => indiaDate(row.move_in_date), className: 'whitespace-nowrap' };

const REGISTER = [UNIT, NAME, INTERCOM, USER_STATUS, LIVES, PRIMARY, lastLog('LastLog'), ASSOC];
const AGREEMENT_TAB: readonly Column[] = [
  UNIT, NAME, INTERCOM, USER_STATUS,
  { key: 'start', header: 'Agreement Start', cell: (row) => indiaDate(row.agreement_start), className: 'whitespace-nowrap' },
  { key: 'end', header: 'Agreement End', cell: (row) => indiaDate(row.agreement_end), className: 'whitespace-nowrap' },
  PRIMARY, lastLog('LastLog'),
];

export const REGISTER_COLUMNS: Record<RegisterPreset, readonly Column[]> = {
  owners: REGISTER,
  tenants: REGISTER,
  ending: AGREEMENT_TAB,
  ended: AGREEMENT_TAB,
  no_agreement: [UNIT, NAME, INTERCOM, USER_STATUS, LIVES, PRIMARY, lastLog('Last Login'), ASSOC],
  deactivated: [NAME, INTERCOM, UNIT, TYPE, JOINED, lastLog('LastLog')],
  deactivated_users: [
    NAME,
    { key: 'email', header: 'Email', cell: (row) => row.email ?? '' },
    INTERCOM,
    { key: 'block', header: 'Block', cell: (row) => row.block ?? '' },
    { key: 'unitno', header: 'Unit', cell: (row) => row.unit_number ?? '' },
    TYPE,
    JOINED,
    { key: 'out', header: 'Deactivated Date', cell: (row) => indiaDate(row.move_out_date), className: 'whitespace-nowrap' },
  ],
};

const AGREEMENT: Partial<Record<RegisterPreset, DirectoryAgreement>> = { ending: 'ending_this_month', ended: 'ended', no_agreement: 'none' };

/** The list's filters for a preset (before search, block and paging). */
export function presetFilters(preset: RegisterPreset): DirectoryFilters {
  if (preset === 'deactivated' || preset === 'deactivated_users') return { status: 'past' };
  if (preset === 'owners') return { member_type: 'owner' };
  return { member_type: 'tenant', ...(AGREEMENT[preset] ? { agreement: AGREEMENT[preset] } : {}) };
}

export const REGISTER_TITLES: Record<RegisterPreset, string> = {
  owners: 'Approved Owners',
  tenants: 'Approved Tenants',
  ending: 'Agreement Ending This Month',
  ended: 'Agreement Ended',
  no_agreement: 'No Agreement Filled',
  deactivated: 'De Activated Resident Accounts',
  deactivated_users: 'De Activated Resident Accounts',
};

export const REGISTER_EMPTY: Record<RegisterPreset, string> = {
  owners: 'No owners in this block.',
  tenants: 'No tenants in this list.',
  ending: 'No tenants in this list.',
  ended: 'No tenants in this list.',
  no_agreement: 'No tenants in this list.',
  deactivated: 'No de-activated accounts.',
  deactivated_users: 'No de-activated accounts.',
};
