'use client';

/**
 * 2026-05-09 (QA #358) — Human-readable audit-diff renderer.
 *
 * The previous audit-trail row dumped `old_data` / `new_data` as raw
 * `JSON.stringify(…, 2)`. Operators couldn't tell what changed
 * without diffing 20-line blobs by eye, and the `(none)` placeholder
 * for `old_data` made the column look broken even on create rows
 * (which legitimately have no prior state).
 *
 * This component renders a 3-column table:
 *
 *   Field | Old | New
 *
 * with the top-10 entity types (per the triage decision) getting
 * curated field labels + value formatters. Unknown entity types
 * fall back to a generic key/value rendering — still tabular,
 * still side-by-side, just without the polish.
 *
 * Only changed fields are highlighted; unchanged fields are dimmed
 * so the eye lands on the diff. Timestamps and the noisy plumbing
 * columns (id, tenant_id, *_at) are filtered out.
 */

import { type ReactNode } from 'react';
import { formatCurrency, formatDate } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Field config — per entity type.
// ---------------------------------------------------------------------------

type ValueFormatter = (value: unknown) => string;

interface FieldConfig {
  label: string;
  /** Optional formatter; defaults to String(value). */
  format?: ValueFormatter;
}

type EntityFieldMap = Record<string, FieldConfig>;

// Helpers reused across maps.
const asCurrency: ValueFormatter = (v) =>
  v == null || v === '' ? '—' : formatCurrency(v as number | string);
const asDate: ValueFormatter = (v) =>
  v == null || v === '' ? '—' : formatDate(String(v));
const asBool: ValueFormatter = (v) => (v ? 'Yes' : 'No');
const asCapital: ValueFormatter = (v) => {
  if (v == null || v === '') return '—';
  const s = String(v).replace(/_/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
};

// Top 10 entity types per QA #358 triage decision (Quick option).
// Every other entity type falls through to the generic renderer.
const FIELD_MAPS: Record<string, EntityFieldMap> = {
  unit: {
    unit_number: { label: 'Unit Number' },
    block: { label: 'Block' },
    floor: { label: 'Floor' },
    area_sqft: { label: 'Area (sqft)' },
    unit_type: { label: 'Type', format: asCapital },
    is_active: { label: 'Active', format: asBool },
    parent_unit_id: { label: 'Parent Unit ID' },
  },
  member: {
    name: { label: 'Name' },
    phone: { label: 'Phone' },
    email: { label: 'Email' },
    member_type: { label: 'Type', format: asCapital },
    move_in_date: { label: 'Move-in Date', format: asDate },
    move_out_date: { label: 'Move-out Date', format: asDate },
    is_current: { label: 'Current', format: asBool },
    user_id: { label: 'User ID' },
    parent_member_id: { label: 'Parent Member ID' },
  },
  invoice: {
    invoice_number: { label: 'Invoice #' },
    invoice_date: { label: 'Invoice Date', format: asDate },
    due_date: { label: 'Due Date', format: asDate },
    billing_period: { label: 'Billing Period' },
    subtotal: { label: 'Subtotal', format: asCurrency },
    gst_amount: { label: 'GST', format: asCurrency },
    lpi_amount: { label: 'LPI', format: asCurrency },
    total_amount: { label: 'Total', format: asCurrency },
    amount_paid: { label: 'Paid', format: asCurrency },
    balance_due: { label: 'Balance Due', format: asCurrency },
    status: { label: 'Status', format: asCapital },
  },
  receipt: {
    receipt_number: { label: 'Receipt #' },
    receipt_date: { label: 'Date', format: asDate },
    amount: { label: 'Amount', format: asCurrency },
    payment_mode: { label: 'Mode', format: asCapital },
    mode: { label: 'Mode', format: asCapital },
    reference_number: { label: 'Reference' },
    bank_account_id: { label: 'Bank Account' },
    status: { label: 'Status', format: asCapital },
  },
  journal_entry: {
    entry_number: { label: 'Entry #' },
    entry_date: { label: 'Date', format: asDate },
    narration: { label: 'Narration' },
    source_type: { label: 'Source', format: asCapital },
    status: { label: 'Status', format: asCapital },
    financial_year_id: { label: 'FY' },
    is_reversed: { label: 'Reversed', format: asBool },
  },
  ledger_account: {
    code: { label: 'Code' },
    name: { label: 'Account Name' },
    group_id: { label: 'Group' },
    opening_balance: { label: 'Opening Balance', format: asCurrency },
    balance_type: { label: 'Balance Type', format: asCapital },
    is_active: { label: 'Active', format: asBool },
    is_bank_account: { label: 'Bank Account', format: asBool },
  },
  account_group: {
    code: { label: 'Code' },
    name: { label: 'Group Name' },
    type: { label: 'Type', format: asCapital },
    parent_id: { label: 'Parent Group' },
    sort_order: { label: 'Sort Order' },
    is_active: { label: 'Active', format: asBool },
  },
  vendor: {
    name: { label: 'Vendor Name' },
    contact_person: { label: 'Contact Person' },
    phone: { label: 'Phone' },
    email: { label: 'Email' },
    gstin: { label: 'GSTIN' },
    pan: { label: 'PAN' },
    tds_section: { label: 'TDS Section' },
    is_active: { label: 'Active', format: asBool },
  },
  ticket: {
    title: { label: 'Title' },
    description: { label: 'Description' },
    category: { label: 'Category', format: asCapital },
    priority: { label: 'Priority', format: asCapital },
    status: { label: 'Status', format: asCapital },
    assigned_to: { label: 'Assigned To' },
    raised_by: { label: 'Raised By' },
    sla_deadline: { label: 'SLA Deadline', format: asDate },
  },
  tenant_onboarding: {
    tenant_name: { label: 'Tenant Name' },
    tenant_phone: { label: 'Tenant Phone' },
    tenant_email: { label: 'Tenant Email' },
    lease_start_date: { label: 'Lease Start', format: asDate },
    lease_end_date: { label: 'Lease End', format: asDate },
    monthly_rent: { label: 'Monthly Rent', format: asCurrency },
    security_deposit: { label: 'Security Deposit', format: asCurrency },
    tenancy_type: { label: 'Tenancy Type', format: asCapital },
    occupancy_type: { label: 'Occupancy', format: asCapital },
    maintenance_payer: { label: 'Maintenance Payer', format: asCapital },
    status: { label: 'Status', format: asCapital },
  },
};

// Noise fields filtered out across all entity types.
const NOISE_FIELDS = new Set([
  'id',
  'tenant_id',
  'created_at',
  'updated_at',
  'deleted_at',
]);

// ---------------------------------------------------------------------------
// Equality + key collection.
// ---------------------------------------------------------------------------

function isPrimitiveEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null && b == null) return true;
  // null/undefined symmetry — audit logs frequently have `null` on one side
  // and `undefined` on the other for newly-added optional columns.
  if ((a == null) !== (b == null)) return false;
  return String(a) === String(b);
}

function gatherKeys(
  oldData: Record<string, unknown> | null | undefined,
  newData: Record<string, unknown> | null | undefined,
): string[] {
  const set = new Set<string>();
  if (oldData) for (const k of Object.keys(oldData)) set.add(k);
  if (newData) for (const k of Object.keys(newData)) set.add(k);
  return [...set].filter((k) => !NOISE_FIELDS.has(k));
}

// ---------------------------------------------------------------------------
// Component.
// ---------------------------------------------------------------------------

interface DiffTableProps {
  entityType: string;
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
}

export function DiffTable({
  entityType,
  oldData,
  newData,
}: DiffTableProps): ReactNode {
  const fieldMap = FIELD_MAPS[entityType] ?? {};
  const keys = gatherKeys(oldData, newData);

  // CREATE-only rows (no oldData) and DELETE-only rows (no newData) get
  // a single-column collapsed view so the operator isn't squinting at a
  // 30-row table of dashes.
  const action: 'create' | 'update' | 'delete' =
    !oldData && newData
      ? 'create'
      : oldData && !newData
        ? 'delete'
        : 'update';

  if (keys.length === 0) {
    return (
      <p className="text-xs italic text-muted-foreground">
        No state captured for this event.
      </p>
    );
  }

  // Sort: configured fields first (in config order), then any remaining
  // unknown fields alphabetically. Keeps the eye on the curated columns.
  const orderedKeys = [
    ...Object.keys(fieldMap).filter((k) => keys.includes(k)),
    ...keys.filter((k) => !(k in fieldMap)).sort(),
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b text-muted-foreground">
            <th className="px-2 py-1 text-left font-medium">Field</th>
            {action !== 'create' && (
              <th className="px-2 py-1 text-left font-medium">Old</th>
            )}
            {action !== 'delete' && (
              <th className="px-2 py-1 text-left font-medium">New</th>
            )}
          </tr>
        </thead>
        <tbody>
          {orderedKeys.map((key) => {
            const cfg = fieldMap[key];
            const label = cfg?.label ?? key.replace(/_/g, ' ');
            const fmt = cfg?.format ?? ((v: unknown) => (v == null || v === '' ? '—' : String(v)));
            const oldVal = oldData?.[key];
            const newVal = newData?.[key];
            const changed = !isPrimitiveEqual(oldVal, newVal);
            const rowClass = changed
              ? 'bg-yellow-50 dark:bg-yellow-900/20'
              : 'text-muted-foreground';

            return (
              <tr key={key} className={`border-b ${rowClass}`}>
                <td className="px-2 py-1 font-medium capitalize">{label}</td>
                {action !== 'create' && (
                  <td className="px-2 py-1 font-mono text-[11px]">
                    {fmt(oldVal)}
                  </td>
                )}
                {action !== 'delete' && (
                  <td
                    className={`px-2 py-1 font-mono text-[11px] ${changed ? 'font-semibold' : ''}`}
                  >
                    {fmt(newVal)}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
