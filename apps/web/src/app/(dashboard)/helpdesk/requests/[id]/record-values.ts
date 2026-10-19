import type { Ticket, UpdateTicketInput } from '@/hooks';

/** What the edit block of the request record holds (HELP-S9). */
export interface RecordValues {
  categoryId: string;
  subcategoryId: string;
  /** YYYY-MM-DD, or ''. */
  serviceDate: string;
  urgent: boolean;
  status: string;
  /** A society_staff id, or '' for Unassigned. */
  servicedBy: string;
  drivenBy: string;
  assetId: string;
}

export type RecordChanges = Omit<UpdateTicketInput, 'id'>;

export function recordValuesOf(ticket: Ticket): RecordValues {
  return {
    categoryId: ticket.category_id ?? '',
    subcategoryId: ticket.subcategory_id ?? '',
    serviceDate: ticket.preferred_service_date ?? '',
    urgent: ticket.priority === 'urgent',
    status: ticket.status,
    servicedBy: ticket.serviced_by_staff_id ?? '',
    drivenBy: ticket.assigned_to ?? '',
    assetId: ticket.related_to_type === 'asset' ? ticket.related_to_id ?? '' : '',
  };
}

const orNull = (value: string): string | null => (value ? value : null);

/**
 * The one PATCH of Save Changes: only what differs from what was loaded.
 * A new category clears the sub-category on the server, so it is sent only
 * when one of the new category's is chosen; unticking "This is urgent!"
 * gives the request its category's default priority back.
 */
export function recordChanges(
  before: RecordValues,
  after: RecordValues,
  defaultPriority: (categoryId: string) => string,
): RecordChanges {
  const changes: RecordChanges = {};
  const categoryMoved = after.categoryId !== before.categoryId;
  if (categoryMoved && after.categoryId) changes.category_id = after.categoryId;
  if (categoryMoved ? after.subcategoryId !== '' : after.subcategoryId !== before.subcategoryId) {
    changes.subcategory_id = orNull(after.subcategoryId);
  }
  if (after.serviceDate !== before.serviceDate) changes.preferred_service_date = orNull(after.serviceDate);
  if (after.urgent !== before.urgent) changes.priority = after.urgent ? 'urgent' : defaultPriority(after.categoryId);
  if (after.status !== before.status) changes.status = after.status;
  if (after.servicedBy !== before.servicedBy) changes.serviced_by_staff_id = orNull(after.servicedBy);
  if (after.drivenBy !== before.drivenBy && after.drivenBy) changes.assigned_to = after.drivenBy;
  if (after.assetId !== before.assetId) changes.linked_asset_id = orNull(after.assetId);
  return changes;
}
