'use client';

import { useState, type ReactNode } from 'react';
import { DataTable, type DataTableAction, type DataTableColumn } from '@/components/data-table';
import { useRouteStatus } from '@/components/layout/menu/use-route-status';
import type { MeetingItem } from '@/hooks';
import { useMeetingList, type MeetingSearchScope, type MeetingState } from '@/hooks/use-meeting-lists';
import { currentRole } from '@/lib/current-role';
import { formatDate } from '@/lib/utils';
import { InviteDialog } from './invite-dialog';
import { inState, MEETING_STATES, MEETINGS_BASE } from '@/lib/meeting-states';

const SCOPES: ReadonlyArray<{ value: MeetingSearchScope; label: string }> = [
  { value: 'topic', label: 'Topic' },
  { value: 'agenda', label: 'Agenda' },
  { value: 'minutes', label: 'Minutes' },
  // PROJ-48 — the resolutions linked to the meeting.
  { value: 'resolution', label: 'Resolution' },
  { value: 'all', label: 'All' },
];

const COLUMNS: DataTableColumn<MeetingItem>[] = [
  // PROJ-20 — the society's running number; blank on an API older than it.
  { key: 'no', header: 'Meet.ID', cell: (row) => row.meeting_no ?? '—' },
  { key: 'date', header: 'Date', cell: (row) => formatDate(row.meeting_date) },
  { key: 'time', header: 'Time', cell: (row) => `${row.start_time.slice(0, 5)} – ${row.end_time.slice(0, 5)}` },
  { key: 'by', header: 'Initiated by', cell: (row) => row.created_by_name ?? '—' },
  { key: 'topic', header: 'Topic', cell: (row) => row.title },
  // PROJ-42 — invitees ticked as attended; blank on an API older than it.
  { key: 'attendees', header: 'Attendees', cell: (row) => row.attendee_count ?? '—' },
];

// PROJ-42 — the people the invitation went to (Open only, as theirs).
const INVITED: DataTableColumn<MeetingItem> = { key: 'invited', header: 'Invited', cell: (row) => row.invited_count ?? '—' };

// governance-meetings MEETING_WRITE_ROLES: Invite is the committee's.
const INVITE_ROLES = new Set(['super_admin', 'community_admin', 'committee_member']);

function actionsFor(state: MeetingState, onInvite: ((meeting: MeetingItem) => void) | null): DataTableAction<MeetingItem>[] {
  if (state === 'closed') {
    return [{ key: 'view', header: 'View', label: 'View', href: (row) => `${MEETINGS_BASE}/${row.id}` }];
  }
  return [
    { key: 'edit', header: 'Edit', label: 'Edit', href: (row) => `${MEETINGS_BASE}/${row.id}/edit` },
    ...(onInvite ? [{ key: 'invite', header: 'Invite', label: 'Invite', onClick: onInvite }] : []),
    { key: 'minutes', header: 'Meeting Minutes', label: 'Meeting Minutes', href: (row) => `${MEETINGS_BASE}/${row.id}/minutes` },
  ];
}

function ScopeRadios({ value, onChange }: { value: MeetingSearchScope; onChange: (scope: MeetingSearchScope) => void }): ReactNode {
  return (
    <fieldset className="flex items-center gap-3 text-sm">
      <legend className="sr-only">Search in</legend>
      {SCOPES.map((scope) => (
        <label key={scope.value} className="flex items-center gap-1">
          <input type="radio" name="meeting-scope" value={scope.value} checked={value === scope.value} onChange={() => onChange(scope.value)} />
          {scope.label}
        </label>
      ))}
    </fieldset>
  );
}

/**
 * Meetings › Open / Closed (PROJ-S6, PROJ-S7): the state comes from the
 * route; the search reads within Topic, Agenda, Minutes or All. Open rows
 * have Edit and Meeting Minutes; a closed meeting is View only.
 */
export function MeetingsList(): ReactNode {
  const route = useRouteStatus(MEETINGS_BASE, MEETING_STATES) ?? MEETING_STATES[0];
  const state = route.slug;
  const [q, setQ] = useState('');
  const [scope, setScope] = useState<MeetingSearchScope>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [inviting, setInviting] = useState<MeetingItem | null>(null);
  const canInvite = INVITE_ROLES.has(currentRole() ?? '');
  const query = useMeetingList({ state, q: q || undefined, scope, page, limit: pageSize });
  // An API older than PROJ-10 ignores state and paging: narrow here.
  const legacy = query.data !== undefined && query.data.counts === undefined;
  const rows = legacy ? query.data!.data.filter((row) => inState(row.status, state)) : (query.data?.data ?? []);

  return (
    <>
    {inviting && <InviteDialog meeting={inviting} onClose={() => setInviting(null)} />}
    <DataTable
      title={`${route.label} Meetings`}
      columns={state === 'open' ? [...COLUMNS, INVITED] : COLUMNS}
      actions={actionsFor(state, canInvite ? setInviting : null)}
      rows={legacy ? rows.slice((page - 1) * pageSize, page * pageSize) : rows}
      rowKey={(row) => row.id}
      total={legacy ? rows.length : (query.data?.total ?? 0)}
      page={page}
      pageSize={pageSize}
      onPageChange={setPage}
      onPageSizeChange={(size) => {
        setPageSize(size);
        setPage(1);
      }}
      search={{ value: q, onChange: (value) => { setQ(value); setPage(1); }, placeholder: 'Search Meeting' }}
      filters={<ScopeRadios value={scope} onChange={(next) => { setScope(next); setPage(1); }} />}
      loading={query.isLoading}
      error={query.error}
      onRetry={() => void query.refetch()}
      emptyText={q ? 'No meeting matches.' : route.emptyText}
    />
    </>
  );
}
