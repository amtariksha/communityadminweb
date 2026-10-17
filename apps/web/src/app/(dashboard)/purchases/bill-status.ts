/**
 * Vendor bill statuses as the API holds them (bill_status): draft, received,
 * partially_paid, paid, overdue, cancelled. A bill is never "approved": that is
 * a purchase request's status.
 */
export const BILL_STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'received', label: 'Received' },
  { value: 'partially_paid', label: 'Partially Paid' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
] as const;

type StatusVariant = 'secondary' | 'warning' | 'success' | 'destructive' | 'default';

export function getBillStatusVariant(status: string): StatusVariant {
  switch (status) {
    case 'draft':
      return 'secondary';
    case 'partially_paid':
      return 'warning';
    case 'paid':
      return 'success';
    case 'overdue':
    case 'cancelled':
      return 'destructive';
    default:
      return 'default';
  }
}

export function getBillStatusLabel(status: string): string {
  switch (status) {
    case 'draft':
      return 'Draft';
    case 'received':
      return 'Received';
    case 'partially_paid':
      return 'Partially Paid';
    case 'paid':
      return 'Paid';
    case 'overdue':
      return 'Overdue';
    case 'cancelled':
      return 'Cancelled';
    default:
      return status;
  }
}
