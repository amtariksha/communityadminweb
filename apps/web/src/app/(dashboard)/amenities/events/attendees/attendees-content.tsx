'use client';

import { useState, type ReactNode } from 'react';
import { DataTable, type DataTableAction } from '@/components/data-table';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { useEvents } from '@/hooks';
import { useEventAttendees, type EventAttendee } from '@/hooks/use-event-tickets';
import { ApiError } from '@/lib/api-error';
import { ATTENDEE_COLUMNS } from './attendee-columns';
import { CancelTicketsDialog } from './cancel-tickets-dialog';

const isLiveTicket = (row: EventAttendee): boolean => !row.tickets_cancelled_at && row.member_tickets + row.guest_tickets > 0;

const PAGE_SIZES = [25, 50, 100] as const;

function AttendeeTable({ eventId, onCancel }: { eventId: string; onCancel: (row: EventAttendee) => void }): ReactNode {
  const attendees = useEventAttendees(eventId);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZES[0]);
  if (attendees.error instanceof ApiError && attendees.error.status === 404) {
    return <p className="text-sm text-muted-foreground">Members Attending is not available yet on this server.</p>;
  }
  const rows = attendees.data ?? [];
  const actions: DataTableAction<EventAttendee>[] = [
    { key: 'action', header: 'Action', label: 'Cancel ticket', onClick: onCancel, hidden: (row) => !isLiveTicket(row) },
  ];
  return (
    <DataTable<EventAttendee>
      title="Members Attending"
      columns={ATTENDEE_COLUMNS}
      actions={actions}
      rows={rows.slice((page - 1) * pageSize, page * pageSize)}
      rowKey={(row) => row.id}
      total={rows.length}
      page={page}
      pageSize={pageSize}
      pageSizeOptions={PAGE_SIZES}
      onPageChange={setPage}
      onPageSizeChange={(size) => {
        setPageSize(size);
        setPage(1);
      }}
      loading={attendees.isLoading}
      error={attendees.isError ? attendees.error : undefined}
      onRetry={() => void attendees.refetch()}
      emptyText="Nobody is attending yet."
    />
  );
}

/**
 * Amenity & Event › Event › Members Attending (AMEN-43, screen AMEN-S9):
 * pick an event and Get Members — who bought tickets (or RSVPed), how many,
 * what they came to, what is paid and left, the receipt and how to reach
 * them; Cancel ticket cancels the invoice with a credit note.
 */
export function AttendeesContent(): ReactNode {
  const events = useEvents('all', '').data ?? [];
  const [picked, setPicked] = useState('');
  const [shown, setShown] = useState('');
  const [cancelTarget, setCancelTarget] = useState<EventAttendee | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="attendees-event">Event</Label>
          <Select id="attendees-event" value={picked} onChange={(e) => setPicked(e.target.value)}>
            <option value="">Select an event</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.title} · {event.event_date.slice(0, 10)}
              </option>
            ))}
          </Select>
        </div>
        <Button onClick={() => setShown(picked)} disabled={!picked}>
          Get Members
        </Button>
      </div>
      {shown ? (
        <AttendeeTable eventId={shown} onCancel={setCancelTarget} />
      ) : (
        <p className="text-sm text-muted-foreground">Pick an event and press Get Members.</p>
      )}
      <CancelTicketsDialog eventId={shown} attendee={cancelTarget} onClose={() => setCancelTarget(null)} />
    </div>
  );
}
