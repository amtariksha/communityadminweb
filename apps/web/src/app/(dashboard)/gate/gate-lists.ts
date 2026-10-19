/**
 * Column keys, status lists and page size of the /gate lists. The keys are
 * the API's field names (`gate_visitors` columns), so an export is filled.
 */

export const GATE_LIST_PAGE_SIZE = 25;

export const VISITOR_EXPORT_COLUMNS = [
  { key: 'visitor_name', label: 'Visitor Name' },
  { key: 'visitor_phone', label: 'Phone' },
  { key: 'purpose', label: 'Purpose' },
  { key: 'unit_number', label: 'Unit' },
  { key: 'status', label: 'Status' },
  { key: 'checked_in_at', label: 'Check In' },
  { key: 'checked_out_at', label: 'Check Out' },
] as const;

// The gate_parcels CHECK (migration 111): received → notified → held → collected.
export const PARCEL_STATUS_OPTIONS = [
  { value: 'received', label: 'Received' },
  { value: 'notified', label: 'Notified' },
  { value: 'held', label: 'Held' },
  { value: 'collected', label: 'Collected' },
] as const;

export const PARCEL_STATUS_BADGE: Record<string, { label: string; variant: 'warning' | 'default' | 'secondary' | 'success' }> = {
  received: { label: 'Received', variant: 'warning' },
  notified: { label: 'Notified', variant: 'default' },
  held: { label: 'Held', variant: 'secondary' },
  collected: { label: 'Collected', variant: 'success' },
};

/** A parcel the admin can hand over by name; a held one needs the resident's code. */
export function canMarkCollected(status: string): boolean {
  return status === 'received' || status === 'notified';
}
