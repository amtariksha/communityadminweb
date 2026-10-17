/**
 * The approval request types the admin queue names and filters by.
 * Order is the order of the Type filter.
 */
export const REQUEST_TYPE_LABELS: Record<string, string> = {
  tenant_onboarding: 'Tenant Onboarding',
  tenant_self_onboard: 'Resident Self-Signup',
  tenant_exit: 'Tenant Exit',
  agreement_renewal: 'Agreement Renewal',
  join_request: 'Join Unit Request',
  purchase_request: 'Purchase Request',
  leave_request: 'Leave Request',
  work_order: 'Work Order',
  document: 'Document',
};

export const REQUEST_TYPE_OPTIONS: ReadonlyArray<{ value: string; label: string }> =
  Object.entries(REQUEST_TYPE_LABELS).map(([value, label]) => ({ value, label }));

export function formatRequestType(type: string): string {
  return (
    REQUEST_TYPE_LABELS[type] ??
    type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  );
}
