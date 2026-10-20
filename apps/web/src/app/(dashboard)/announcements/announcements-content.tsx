'use client';

import { useCallback, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Megaphone, Plus, Settings } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PageHeader } from '@/components/layout/page-header';
import { ExportButton } from '@/components/ui/export-button';
import { useOpenOnNewParam } from '@/hooks/use-open-on-new-param';
import { useAdminLayout } from '@/lib/layout-context';
import { announcementState, useAnnouncements, type Announcement, type AnnouncementState } from '@/hooks';
import { CATEGORY_OPTIONS, STATE_LABELS, recipientsLabel, typeLabel } from './_parts/labels';
import { NoticeActionDialogs, useNoticeActions } from './_parts/notice-actions';
import { NoticeDetailOf } from './_parts/notice-detail';
import { NoticeEditor } from './_parts/notice-editor';
import { NoticeTable } from './_parts/notice-table';
import { StateTabs } from './_parts/state-tabs';
import { todayIST } from '@/lib/date';

const PAGE_SIZE = 20;

const EMPTY_TEXT: Readonly<Record<AnnouncementState, string>> = {
  draft: 'There are no drafts.',
  awaiting_approval: 'Nothing is waiting for approval.',
  active: 'There are no active announcements.',
  retired: 'No retired announcements match.',
};

/** ANN-01 / ANN-03 — the export's Status is the state the table shows. */
export function exportRows(announcements: Announcement[]): Record<string, unknown>[] {
  return announcements.map((announcement) => ({
    ...announcement,
    status: STATE_LABELS[announcementState(announcement)],
    recipients: recipientsLabel(announcement),
    type: typeLabel(announcement),
  }));
}

type Editing = { open: false } | { open: true; notice?: Announcement };

/**
 * Standard Announcements (ANN-03 / ANN-04): Drafts · Awaiting Approval ·
 * Active · Retired as tabs once the server counts them, search and Category,
 * and every state's actions. Classic has a page per state (ANN-10).
 */
export default function AnnouncementsContent(): ReactNode {
  const [tab, setTab] = useState<AnnouncementState>('active');
  const [category, setCategory] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Editing>({ open: false });
  const [viewing, setViewing] = useState<Announcement | null>(null);
  const actions = useNoticeActions(() => setViewing(null));

  const query = useAnnouncements({ category: category || undefined, q: q || undefined, state: tab, page, limit: PAGE_SIZE });
  const counts = query.data?.counts;
  // A server from before ANN-03 ignores `state`: then one list, as before.
  const rows = query.data?.data ?? [];
  const total = query.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const layout = useAdminLayout();
  const openCreate = useCallback(() => setEditing({ open: true }), []);
  // The dashboard's Post Announcement: the form's page in classic (SB-07).
  useOpenOnNewParam(openCreate, layout === 'classic' ? '/announcements/new' : undefined);
  const choose = (next: AnnouncementState) => {
    setTab(next);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Announcements' }]}
        title="Announcements"
        description="Post notices to residents — with approval, expiry and a Retired archive"
        actions={
          <>
            <ExportButton
              data={exportRows(rows)}
              filename={`announcements-${todayIST()}`}
              columns={[
                { key: 'title', label: 'Title' },
                { key: 'type', label: 'Type' },
                { key: 'priority', label: 'Priority' },
                { key: 'recipients', label: 'Recipients' },
                { key: 'status', label: 'Status' },
                { key: 'created_at', label: 'Created' },
                { key: 'published_at', label: 'Published' },
              ]}
            />
            <Link href="/announcements/setup" className={buttonVariants({ variant: 'outline' })}>
              <Settings className="mr-2 h-4 w-4" /> Setup
            </Link>
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" /> New Announcement
            </Button>
          </>
        }
      />

      {counts && <StateTabs active={tab} counts={counts} onChange={choose} />}

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label htmlFor="announcement-search">Search</Label>
              <Input id="announcement-search" type="search" className="w-64" placeholder="Search announcements..." value={q}
                onChange={(e) => { setQ(e.target.value); setPage(1); }} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="announcement-category">Category</Label>
              <Select id="announcement-category" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}>
                <option value="">All</option>
                {CATEGORY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5" /> {counts ? STATE_LABELS[tab] : 'Announcements'}
            </CardTitle>
            <p className="text-sm text-muted-foreground">{total} total</p>
          </div>
        </CardHeader>
        <CardContent>
          <NoticeTable
            rows={rows}
            loading={query.isLoading}
            actions={actions}
            onView={setViewing}
            onEdit={(notice) => setEditing({ open: true, notice })}
            emptyText={counts ? EMPTY_TEXT[tab] : 'No announcements found'}
          />
          {pages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Page {page} of {pages}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" aria-label="Previous page" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" aria-label="Next page" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {editing.open && (
        <NoticeEditor
          key={editing.notice?.id ?? 'new'}
          mode="dialog"
          open
          notice={editing.notice}
          onClose={() => setEditing({ open: false })}
          onSaved={() => setEditing({ open: false })}
        />
      )}

      <Dialog open={viewing !== null} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{viewing?.title ?? ''}</DialogTitle>
            <DialogDescription>{viewing?.author_name ? `By ${viewing.author_name}` : ''}</DialogDescription>
          </DialogHeader>
          {viewing && <NoticeDetailOf row={viewing} />}
        </DialogContent>
      </Dialog>

      <NoticeActionDialogs actions={actions} />
    </div>
  );
}
