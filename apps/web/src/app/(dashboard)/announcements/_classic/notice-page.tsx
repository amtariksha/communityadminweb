'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { ShowLogsButton } from '@/components/show-logs';
import { Button, buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { announcementState, useAnnouncement } from '@/hooks';
import { NoticeActionDialogs, useNoticeActions } from '../_parts/notice-actions';
import { NoticeDetail } from '../_parts/notice-detail';

/** ANN-S6 — one announcement as a page: Edit Expiry (Active), Delete, Show Logs, Close. */
export function NoticePage({ id }: { id: string }): ReactNode {
  const router = useRouter();
  const notice = useAnnouncement(id);
  const actions = useNoticeActions((kind) => {
    if (kind === 'retire' || kind === 'delete') router.push('/announcements/active');
  });
  if (notice.isLoading) return <Skeleton className="h-64 w-full" />;
  if (!notice.data) return <p className="text-sm text-muted-foreground">Announcement not found.</p>;
  const state = announcementState(notice.data);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{notice.data.title}</h2>
        <div className="flex flex-wrap gap-2">
          {state === 'active' && (
            <Button variant="outline" onClick={() => notice.data && actions.askExpiry(notice.data)}>Edit Expiry</Button>
          )}
          {(state === 'active' || state === 'draft') && (
            <Button variant="destructive" onClick={() => notice.data && actions.askDelete(notice.data)}>Delete</Button>
          )}
          <ShowLogsButton recordTypes={['announcement']} recordId={id} />
          <Link href="/announcements/active" className={buttonVariants({ variant: 'outline' })}>Close</Link>
        </div>
      </div>
      <NoticeDetail notice={notice.data} />
      <NoticeActionDialogs actions={actions} />
    </div>
  );
}
