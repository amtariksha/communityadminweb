'use client';

import type { ReactNode } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { useAdminLayout } from '@/lib/layout-context';
import { NoticeActionDialogs, useNoticeActions } from '../_parts/notice-actions';
import { NoticeSection } from './notice-section';
import { RetiredFilterPanel, useRetiredFilters } from './retired-filters';

function Frame({ title, children }: { title: string; children: ReactNode }): ReactNode {
  const layout = useAdminLayout();
  return (
    <div className="space-y-6">
      {layout === 'standard' && <PageHeader breadcrumbs={[{ label: 'Announcements', href: '/announcements' }, { label: title }]} title={title} />}
      {children}
    </div>
  );
}

/** Announcements › Awaiting Approval (ANN-S2). */
export function AwaitingApprovalPage(): ReactNode {
  const actions = useNoticeActions();
  return (
    <Frame title="Awaiting Approval">
      <NoticeSection list="awaiting" source="committee" title="Approve Announcement" emptyText="Nothing is waiting for approval." actions={actions} />
      <NoticeSection list="awaiting" source="member" title="Member Announcements" emptyText="Nothing is waiting for approval." actions={actions} />
      <NoticeActionDialogs actions={actions} />
    </Frame>
  );
}

/** Announcements › Active (ANN-S3). */
export function ActivePage(): ReactNode {
  const actions = useNoticeActions();
  return (
    <Frame title="Active">
      <NoticeSection list="active" source="committee" title="Current Active Announcements" emptyText="There are no active announcements." actions={actions} />
      <NoticeSection list="active" source="member" title="Member Announcements" emptyText="There are no active announcements." actions={actions} />
      <NoticeActionDialogs actions={actions} />
    </Frame>
  );
}

/** Announcements › Retired (ANN-S4): read-only, 100 a page, search and a filter panel. */
export function RetiredPage(): ReactNode {
  const actions = useNoticeActions();
  const panel = useRetiredFilters();
  const shared = { list: 'retired' as const, actions, pageSize: 100, search: true, filters: panel.applied, emptyText: 'No retired announcements match.' };
  return (
    <Frame title="Retired">
      <RetiredFilterPanel panel={panel} />
      <NoticeSection {...shared} source="committee" title="Retired Announcements" />
      <NoticeSection {...shared} source="member" title="Retired Member Announcements" />
    </Frame>
  );
}
