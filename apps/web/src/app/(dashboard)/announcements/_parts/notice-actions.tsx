'use client';

import { useState, type ReactNode } from 'react';
import { useToast } from '@/components/ui/toast';
import {
  announcementState,
  useApproveAnnouncement,
  useDeleteAnnouncement,
  usePublishAnnouncement,
  useRejectAnnouncement,
  useRetireAnnouncement,
  useUpdateAnnouncement,
  type Announcement,
} from '@/hooks';
import { friendlyError } from '@/lib/api-error';
import { dateIST } from '@/lib/date';
import { isNotDeployed } from '@/lib/not-deployed';
import { DeleteDraftDialog, EditExpiryDialog, RejectDialog, RetireDialog } from './notice-dialogs';

type Pending = { kind: 'retire' | 'delete' | 'reject' | 'expiry'; notice: Announcement } | null;

/**
 * The row actions of the announcement lists — Post, Approve, Reject, Edit
 * Expiry and Delete (retire for a posted notice, delete for a draft) — with
 * their confirmations and messages. A server without the new routes says
 * "not available yet" instead of failing.
 */
export function useNoticeActions(onDone?: (kind: 'post' | 'approve' | 'retire' | 'delete' | 'reject' | 'expiry') => void) {
  const { addToast } = useToast();
  const [pending, setPending] = useState<Pending>(null);
  const publish = usePublishAnnouncement();
  const approve = useApproveAnnouncement();
  const reject = useRejectAnnouncement();
  const retire = useRetireAnnouncement();
  const remove = useDeleteAnnouncement();
  const update = useUpdateAnnouncement();

  function fail(title: string) {
    return (error: unknown) =>
      addToast({
        title,
        description: isNotDeployed(error) ? 'This is not available yet on this server.' : friendlyError(error),
        variant: 'destructive',
      });
  }

  function done(title: string, kind: 'approve' | 'retire' | 'delete' | 'reject' | 'expiry') {
    return () => {
      addToast({ title, variant: 'success' });
      setPending(null);
      onDone?.(kind);
    };
  }

  return {
    pending,
    close: () => setPending(null),
    busy: retire.isPending || remove.isPending || reject.isPending || update.isPending,
    post: (notice: Announcement) =>
      publish.mutate({ id: notice.id }, {
        onSuccess: (res) =>
          addToast({
            title: announcementState(res.data) === 'awaiting_approval' ? 'Sent for approval' : 'Announcement posted',
            variant: 'success',
          }),
        onError: fail('The announcement was not posted'),
      }),
    approve: (notice: Announcement) =>
      approve.mutate({ id: notice.id }, { onSuccess: done('Announcement approved', 'approve'), onError: fail('Not approved') }),
    askDelete: (notice: Announcement) =>
      setPending({ kind: announcementState(notice) === 'draft' ? 'delete' : 'retire', notice }),
    askReject: (notice: Announcement) => setPending({ kind: 'reject', notice }),
    askExpiry: (notice: Announcement) => setPending({ kind: 'expiry', notice }),
    confirmRetire: (reason?: string) =>
      pending && retire.mutate({ id: pending.notice.id, reason }, { onSuccess: done('Moved to Retired', 'retire'), onError: fail('Not retired') }),
    confirmDelete: () =>
      pending && remove.mutate({ id: pending.notice.id }, { onSuccess: done('Draft deleted', 'delete'), onError: fail('Not deleted') }),
    confirmReject: (reason: string) =>
      pending && reject.mutate({ id: pending.notice.id, reason }, { onSuccess: done('Returned to the author', 'reject'), onError: fail('Not rejected') }),
    confirmExpiry: (date: string | null) =>
      pending && update.mutate({ id: pending.notice.id, expires_at: date }, { onSuccess: done('Expiry saved', 'expiry'), onError: fail('Expiry not saved') }),
  };
}

export type NoticeActions = ReturnType<typeof useNoticeActions>;

/** The confirmations the row actions open. */
export function NoticeActionDialogs({ actions }: { actions: NoticeActions }): ReactNode {
  const { pending } = actions;
  const key = pending ? `${pending.kind}-${pending.notice.id}` : 'none';
  return (
    <>
      <RetireDialog key={`r-${key}`} open={pending?.kind === 'retire'} busy={actions.busy} onClose={actions.close} onConfirm={actions.confirmRetire} />
      <DeleteDraftDialog open={pending?.kind === 'delete'} busy={actions.busy} onClose={actions.close} onConfirm={actions.confirmDelete} />
      <RejectDialog key={`j-${key}`} open={pending?.kind === 'reject'} busy={actions.busy} onClose={actions.close} onConfirm={actions.confirmReject} />
      <EditExpiryDialog
        key={`e-${key}`}
        open={pending?.kind === 'expiry'}
        busy={actions.busy}
        current={pending?.notice.expires_at ? dateIST(pending.notice.expires_at) : ''}
        onClose={actions.close}
        onConfirm={actions.confirmExpiry}
      />
    </>
  );
}
