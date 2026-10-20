'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { DataTable, type DataTableAction, type DataTableColumn } from '@/components/data-table';
import { buttonVariants } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { useEvents, useInviteEvent, type EventItem } from '@/hooks';
import { ApiError, friendlyError } from '@/lib/api-error';
import { isNotDeployed } from '@/lib/not-deployed';
import { formatDate } from '@/lib/utils';

const PAGE_SIZES = [10, 25, 50] as const;
const INVITABLE = new Set(['published', 'ongoing']);

const hhmm = (value: string): string => value.slice(0, 5);

const COLUMNS: DataTableColumn<EventItem>[] = [
  { key: 'event', header: 'Events', cell: (row) => row.title, className: 'font-medium' },
  // AMEN-23 — a Regular class runs to its end date; a one-day event ends on its date.
  { key: 'start', header: 'Start Date', cell: (row) => `${formatDate(row.event_date)} ${hhmm(row.start_time)}`, className: 'whitespace-nowrap' },
  { key: 'end', header: 'End Date', cell: (row) => `${formatDate(row.end_date ?? row.event_date)} ${hhmm(row.end_time)}`, className: 'whitespace-nowrap' },
  { key: 'venue', header: 'Venue', cell: (row) => row.amenity_name ?? row.location ?? '' },
  { key: 'status', header: 'Status', cell: (row) => row.status.replace(/^./, (c) => c.toUpperCase()) },
];

function inviteError(error: unknown): string {
  if (isNotDeployed(error) && !(error instanceof ApiError && error.code)) return 'Invite is not available yet on this server.';
  return friendlyError(error);
}

function useInvite() {
  const { addToast } = useToast();
  const invite = useInviteEvent();
  return useCallback(
    (row: EventItem) =>
      invite.mutate(row.id, {
        onSuccess: (result) =>
          addToast({ title: `Invitation sent to ${result.sent} resident${result.sent === 1 ? '' : 's'}`, variant: 'success' }),
        onError: (error) => addToast({ title: `Could not invite for ${row.title}`, description: inviteError(error), variant: 'destructive' }),
      }),
    [invite, addToast],
  );
}

/**
 * Amenity & Event › Setup › Event (AMEN-12, screen AMEN-S3): every event
 * with Invite (published ones: the audience gets one notification each)
 * and Edit (the event form as a page). Add Event opens the same page.
 */
export function EventsSetupContent(): ReactNode {
  const eventsQuery = useEvents('all', '');
  const invite = useInvite();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZES[0]);
  const events = useMemo(() => eventsQuery.data ?? [], [eventsQuery.data]);
  const actions: DataTableAction<EventItem>[] = [
    { key: 'invite', header: 'Invite', label: 'Invite', onClick: invite, hidden: (row) => !INVITABLE.has(row.status) },
    { key: 'edit', header: 'Edit', label: 'Edit', href: (row) => `/amenities/events/${row.id}/edit` },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Link href="/amenities/events/new" className={buttonVariants()} data-slot="button" data-size="default">
          Add Event
        </Link>
      </div>
      <DataTable<EventItem>
        title="Events"
        columns={COLUMNS}
        actions={actions}
        rows={events.slice((page - 1) * pageSize, page * pageSize)}
        rowKey={(row) => row.id}
        total={events.length}
        page={page}
        pageSize={pageSize}
        pageSizeOptions={PAGE_SIZES}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
        loading={eventsQuery.isLoading}
        error={eventsQuery.isError ? eventsQuery.error : undefined}
        onRetry={() => void eventsQuery.refetch()}
        emptyText="No events yet."
      />
    </div>
  );
}
