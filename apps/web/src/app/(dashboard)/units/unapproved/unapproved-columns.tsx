'use client';

import type { DataTableColumn } from '@/components/data-table';
import type { BulkApprovalResult, UnapprovedRequest } from '@/hooks/use-unapproved-users';
import { formatDate } from '@/lib/utils';

const MEMBERSHIP_LABELS: Record<string, string> = { tenant: 'Tenant', tenant_family: 'Tenant Family' };

export function membershipLabel(memberType: string): string {
  return MEMBERSHIP_LABELS[memberType] ?? memberType.replace(/_/g, ' ');
}

export function waitingLabel(row: Pick<UnapprovedRequest, 'waiting_for'>): string {
  return row.waiting_for === 'owner' ? 'Waiting for unit owner' : 'Waiting for society';
}

/** The columns of both tables (UNIT-S1), in the screen's order. */
export const UNAPPROVED_COLUMNS: DataTableColumn<UnapprovedRequest>[] = [
  { key: 'name', header: 'Name', cell: (row) => row.name },
  { key: 'phone', header: 'Phone/Mobile', cell: (row) => row.phone, className: 'whitespace-nowrap' },
  { key: 'email', header: 'Email', cell: (row) => row.email ?? '' },
  { key: 'status', header: 'Status/Notes', cell: (row) => waitingLabel(row) },
  { key: 'block', header: 'Block', cell: (row) => row.block ?? '' },
  { key: 'unit', header: 'Unit', cell: (row) => row.unit_number },
  { key: 'membership', header: 'Membership Status', cell: (row) => membershipLabel(row.member_type) },
  { key: 'joined', header: 'Joined On', cell: (row) => formatDate(row.created_at), className: 'whitespace-nowrap' },
];

interface ApproveColumnOptions {
  selected: ReadonlySet<string>;
  onToggle: (id: string) => void;
  results: ReadonlyMap<string, BulkApprovalResult>;
}

const RESULT_CLASS: Record<BulkApprovalResult['status'], string> = {
  approved: 'text-success',
  advanced: 'text-success',
  skipped: 'text-muted-foreground',
  error: 'text-destructive',
};

/** Approve: a tick per row; the last bulk approve's outcome shows under it. */
export function approveColumn({ selected, onToggle, results }: ApproveColumnOptions): DataTableColumn<UnapprovedRequest> {
  return {
    key: 'approve',
    header: 'Approve',
    text: () => '',
    cell: (row) => {
      const result = results.get(row.approval_id);
      return (
        <div className="space-y-1">
          <input
            type="checkbox"
            aria-label={`Approve ${row.name}`}
            className="h-4 w-4"
            checked={selected.has(row.approval_id)}
            onChange={() => onToggle(row.approval_id)}
          />
          {result && <p className={`text-xs ${RESULT_CLASS[result.status]}`}>{result.message}</p>}
        </div>
      );
    },
  };
}
