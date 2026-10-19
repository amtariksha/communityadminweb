/** Purchase request status words (EXP-S4 / S5): `cancelled` reads Withdrawn. */
const LABELS: Readonly<Record<string, string>> = {
  draft: 'Draft',
  pending_approval: 'Pending approval',
  approved: 'Approved',
  converted: 'Converted to invoice',
  rejected: 'Rejected',
  cancelled: 'Withdrawn',
  completed: 'Completed',
};

export function prStatusLabel(status: string): string {
  return LABELS[status] ?? status;
}
