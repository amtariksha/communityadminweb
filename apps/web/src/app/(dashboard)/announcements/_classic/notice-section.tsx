'use client';

import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { DataTable, type DataTableAction } from '@/components/data-table';
import { useAnnouncementRights, useAnnouncements, type Announcement, type AnnouncementFilters, type AnnouncementState } from '@/hooks';
import { getUser } from '@/lib/auth';
import { useWord } from '@/lib/vocabulary';
import type { NoticeActions } from '../_parts/notice-actions';
import { noticeColumns, type ClassicList } from './notice-columns';

const STATE_OF: Readonly<Record<ClassicList, AnnouncementState>> = {
  awaiting: 'awaiting_approval',
  active: 'active',
  retired: 'retired',
};

/** Edit Expiry is for Set Expiry holders — or every editor while nobody holds it (ANN-S3). */
function useExpiryRight(): boolean {
  const rights = useAnnouncementRights();
  const user = getUser();
  const holders = (rights.data ?? []).filter((row) => row.can_set_expiry).map((row) => row.user_id);
  return user?.isSuperAdmin === true || holders.length === 0 || (user !== null && holders.includes(user.id));
}

function rowActions(list: ClassicList, actions: NoticeActions, mayEditExpiry: boolean): DataTableAction<Announcement>[] {
  const view: DataTableAction<Announcement> = { key: 'view', header: 'View', label: 'View', href: (row) => `/announcements/${row.id}` };
  if (list === 'awaiting') {
    return [
      view,
      { key: 'approve', header: 'Approve', label: 'Approve', onClick: actions.approve, hidden: (row) => !row.can_approve },
      { key: 'reject', header: 'Reject', label: 'Reject', onClick: actions.askReject, hidden: (row) => !row.can_approve },
    ];
  }
  if (list === 'active') {
    return [
      view,
      { key: 'expiry', header: 'Edit Expiry', label: 'Edit Expiry', onClick: actions.askExpiry, hidden: () => !mayEditExpiry },
      { key: 'delete', header: 'Delete', label: 'Delete', onClick: actions.askDelete },
    ];
  }
  return [view];
}

export interface NoticeSectionProps {
  list: ClassicList;
  source: 'committee' | 'member';
  title: string;
  emptyText: string;
  actions: NoticeActions;
  pageSize?: number;
  /** Retired: the search box and the filter panel's values. */
  search?: boolean;
  filters?: Pick<AnnouncementFilters, 'posted_from' | 'posted_to' | 'classification' | 'audience'>;
  filterPanel?: ReactNode;
}

/** One section of a classic announcement list (SB-04 table, labelled action columns). */
export function NoticeSection(props: NoticeSectionProps): ReactNode {
  const word = useWord();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const pageSize = props.pageSize ?? 25;
  const query = useAnnouncements({ state: STATE_OF[props.list], source: props.source, q: q || undefined, ...props.filters, page, limit: pageSize });
  const mayEditExpiry = useExpiryRight();
  const columns = useMemo(() => noticeColumns(props.list, word), [props.list, word]);
  const onSearch = useCallback((value: string) => {
    setQ(value);
    setPage(1);
  }, []);
  return (
    <section className="space-y-2">
      <h3 className="text-base font-semibold">{props.title}</h3>
      <DataTable<Announcement>
        title={props.title}
        serialHeader="Sl.No"
        columns={columns}
        actions={rowActions(props.list, props.actions, mayEditExpiry)}
        rows={query.data?.data ?? []}
        rowKey={(row) => row.id}
        total={query.data?.total ?? 0}
        page={page}
        pageSize={pageSize}
        pageSizeOptions={[pageSize]}
        onPageChange={setPage}
        search={props.search ? { value: q, onChange: onSearch, placeholder: 'Search announcements...' } : undefined}
        filters={props.filterPanel}
        loading={query.isLoading}
        error={query.error}
        onRetry={() => void query.refetch()}
        emptyText={props.emptyText}
      />
    </section>
  );
}
