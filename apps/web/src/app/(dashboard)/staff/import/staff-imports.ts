import type { ImportPreviewColumn } from '@/components/import/import-rows-table';

/** Staff Manager › Bulk Upload Essential · Bulk Upload Advanced · Upload Attendance (STAFF-S7, STAFF-35). */
export interface StaffImport {
  kind: 'essential' | 'advanced' | 'attendance';
  type: string;
  label: string;
  description: string;
  columns: readonly ImportPreviewColumn[];
}

export const STAFF_IMPORTS_ENDPOINT = '/staff/imports';

const ESSENTIAL: readonly ImportPreviewColumn[] = [
  { key: 'name', label: 'Staff Name' },
  { key: 'badge_no', label: 'Badge No.' },
  { key: 'category', label: 'Category' },
  { key: 'phone', label: 'Contact No.' },
  { key: 'status', label: 'Status' },
  { key: 'status_reason', label: 'Status Reason' },
];

export const STAFF_IMPORTS: readonly StaffImport[] = [
  {
    kind: 'essential',
    type: 'staff_essential',
    label: 'Bulk Upload Essential',
    description: 'Society staff by Badge No.: a new badge adds the person, a known one updates them. A wrong row (a bad phone, an unknown category) is reported and the others are saved.',
    columns: ESSENTIAL,
  },
  {
    kind: 'advanced',
    type: 'staff_advanced',
    label: 'Bulk Upload Advanced',
    description: 'As Essential, with every Add Staff field. Household help is added from Add Household Help, with the flats it serves.',
    columns: [
      ...ESSENTIAL,
      { key: 'designation', label: 'Designation' },
      { key: 'gender', label: 'Gender' },
      { key: 'join_date', label: 'Join Date' },
      { key: 'badge_issued_on', label: 'Badge Issued On' },
      { key: 'badge_validity_months', label: 'Badge Validity (months)' },
      { key: 'exit_date', label: 'Leaving Date' },
      { key: 'salary', label: 'Salary' },
    ],
  },
  {
    kind: 'attendance',
    type: 'staff_attendance',
    label: 'Upload Attendance',
    description: 'One session per row for society staff (India time). An out time before the in time is the next morning. Household help’s attendance comes from the gate log.',
    columns: [
      { key: 'badge_no', label: 'Badge No.' },
      { key: 'date', label: 'Date' },
      { key: 'in_time', label: 'In time' },
      { key: 'out_time', label: 'Out time' },
    ],
  },
];

export const staffImport = (kind: string): StaffImport | undefined => STAFF_IMPORTS.find((entry) => entry.kind === kind);

export const staffImportHref = (kind: StaffImport['kind']): string => `/staff/import/${kind}`;

/** Add Staff's writers (STAFF-S3): the community admin and the accountant (the grid may narrow it). */
export const STAFF_IMPORT_ROLES: ReadonlySet<string> = new Set(['super_admin', 'community_admin', 'accountant']);
