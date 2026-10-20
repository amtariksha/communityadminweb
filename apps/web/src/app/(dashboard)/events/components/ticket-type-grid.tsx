'use client';

import { type ReactNode } from 'react';
import {
  EditableGrid,
  rowErrorsFromApi,
  type GridChange,
  type GridColumn,
  type GridRowState,
  type GridSaveResult,
} from '@/components/editable-grid';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import {
  useEventTicketTypes,
  useSaveEventTicketTypes,
  type EventTicketType,
  type EventTicketTypeRowInput,
} from '@/hooks/use-event-tickets';
import { ApiError, friendlyError } from '@/lib/api-error';

/**
 * AMEN-43 — an event's ticket types (their inputs were not captured; these
 * are ours): a slot, the member and guest prices and a capacity of tickets.
 * An event with an active ticket type sells tickets instead of taking RSVPs;
 * each purchase is invoiced to the buyer's flat. Retired, never deleted.
 */

export interface TicketTypeValues {
  slot: string;
  memberPrice: string;
  guestPrice: string;
  capacity: string;
  sold: number;
}

const blank = (): TicketTypeValues => ({ slot: '', memberPrice: '', guestPrice: '', capacity: '', sold: 0 });
const isBlank = (values: TicketTypeValues): boolean => !values.slot.trim() && !values.memberPrice && !values.guestPrice && !values.capacity;

export function savedTicketTypeRows(types: readonly EventTicketType[]) {
  return types.map((type) => ({
    id: type.id,
    inactive: !type.is_active,
    values: {
      slot: type.slot_label,
      memberPrice: type.member_price,
      guestPrice: type.guest_price,
      capacity: type.capacity === null ? '' : String(type.capacity),
      sold: type.sold,
    },
  }));
}

export function validateTicketTypes(rows: readonly GridRowState<TicketTypeValues>[]): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const row of rows) {
    if (!row.id && isBlank(row.values)) continue;
    const { slot, memberPrice, guestPrice, capacity } = row.values;
    if (!slot.trim()) errors[row.key] = 'Name the slot.';
    else if (!(Number(memberPrice || 0) >= 0) || !(Number(guestPrice || 0) >= 0)) errors[row.key] = 'Prices are 0 or more.';
    else if (capacity.trim() && !(Number.isInteger(Number(capacity)) && Number(capacity) > 0)) errors[row.key] = 'Capacity is a whole number above 0.';
  }
  return errors;
}

export function toTicketTypeRows(change: GridChange<TicketTypeValues>): EventTicketTypeRowInput[] {
  return change.rows.map((row) => ({
    ...(row.id ? { id: row.id } : {}),
    slot_label: row.values.slot.trim(),
    member_price: Number(row.values.memberPrice || 0),
    guest_price: Number(row.values.guestPrice || 0),
    capacity: row.values.capacity.trim() ? Number(row.values.capacity) : null,
    is_active: !row.inactive,
  }));
}

const COLUMNS: GridColumn<TicketTypeValues>[] = [
  { key: 'slot', header: 'Slot', kind: 'text', field: 'slot', maxLength: 60, placeholder: 'e.g. Evening' },
  { key: 'member', header: 'Member Price', kind: 'number', field: 'memberPrice', min: 0, step: 0.01 },
  { key: 'guest', header: 'Guest Price', kind: 'number', field: 'guestPrice', min: 0, step: 0.01 },
  { key: 'capacity', header: 'Capacity', kind: 'number', field: 'capacity', min: 1, step: 1 },
  { key: 'sold', header: 'Sold', kind: 'custom', render: ({ row }) => <span className="tabular-nums">{row.values.sold}</span> },
];

export function TicketTypeGrid({ eventId }: { eventId: string }): ReactNode {
  const { addToast } = useToast();
  const typesQuery = useEventTicketTypes(eventId);
  const save = useSaveEventTicketTypes(eventId);

  if (typesQuery.isLoading) return <Skeleton className="h-24 w-full" />;
  if (typesQuery.error || !typesQuery.data) {
    const notYet = typesQuery.error instanceof ApiError && typesQuery.error.status === 404;
    return <p className="text-sm text-muted-foreground">{notYet ? 'Tickets are not available yet on this server.' : 'The ticket types could not be loaded.'}</p>;
  }
  const types = typesQuery.data;

  async function onSave(change: GridChange<TicketTypeValues>): Promise<GridSaveResult | void> {
    try {
      await save.mutateAsync(toTicketTypeRows(change));
      addToast({ title: 'Tickets saved', variant: 'success' });
    } catch (error) {
      addToast({ title: 'Could not save the tickets', description: friendlyError(error), variant: 'destructive' });
      return { rowErrors: rowErrorsFromApi(error, change) };
    }
  }

  return (
    <EditableGrid
      key={types.map((type) => `${type.id}:${type.is_active}`).join(',')}
      label="Tickets"
      columns={COLUMNS}
      rows={savedTicketTypeRows(types)}
      blank={blank}
      isBlank={isBlank}
      validate={validateTicketTypes}
      spareRows={2}
      reorder
      deactivate={{ header: 'Retire', label: 'Retire' }}
      isSaving={save.isPending}
      emptyText="No tickets: residents RSVP for free"
      onSave={onSave}
    />
  );
}
