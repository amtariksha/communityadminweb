'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import type { DataTableAction } from '@/components/data-table';
import { useToast } from '@/components/ui/toast';
import { useApprovePR, useRejectPR } from '@/hooks/use-purchases';
import {
  purchaseRequestKeys,
  useSubmitPurchaseRequest,
  useWithdrawPurchaseRequest,
  type PRBucket,
  type PRListRow,
} from '@/hooks/use-purchase-requests';
import { friendlyError } from '@/lib/api-error';
import { getUser } from '@/lib/auth';
import { canWriteFinance } from '@/lib/finance-roles';

export const REQUEST_PAGE = (id: string): string => `/expense-tracker/purchase-workflow/${id}`;

/** EXP-10 — Post vendor invoice for the request's vendor, filled from the request. */
export const CONVERT_PAGE = (row: Pick<PRListRow, 'id' | 'vendor_id'>): string =>
  `/expense-tracker/by-vendors/${row.vendor_id}/invoice?from_request=${row.id}`;

/**
 * The labelled row buttons of a bucket (EXP-S4): View always; Edit and
 * Send on your drafts; Approve and Reject where you hold a pending step;
 * Withdraw on your request while it waits.
 */
export function useRequestActions(bucket: PRBucket): DataTableAction<PRListRow>[] {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const approve = useApprovePR();
  const reject = useRejectPR();
  const submit = useSubmitPurchaseRequest();
  const withdraw = useWithdrawPurchaseRequest();
  const me = getUser()?.id ?? null;
  const mine = (row: PRListRow) => row.requested_by === me;

  const done = (title: string) => ({
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: purchaseRequestKeys.lists() });
      addToast({ title, variant: 'success' as const });
    },
    onError: (failure: unknown) => addToast({ title: 'Could not do that', description: friendlyError(failure), variant: 'destructive' as const }),
  });
  const onReject = (row: PRListRow) => {
    const reason = window.prompt(`Reason for rejecting ${row.pr_number}`)?.trim();
    if (reason) reject.mutate({ id: row.id, data: { level: row.current_level ?? 1, comments: reason } }, done('Request rejected'));
  };

  const view: DataTableAction<PRListRow> = { key: 'view', header: 'View', label: 'View', href: (row) => REQUEST_PAGE(row.id) };
  if (bucket === 'drafts') {
    return [
      view,
      { key: 'edit', header: 'Edit', label: 'Edit', hidden: (row) => !mine(row), onClick: (row) => router.push(REQUEST_PAGE(row.id)) },
      { key: 'send', header: 'Send', label: 'Send', hidden: (row) => !mine(row), onClick: (row) => submit.mutate({ id: row.id }, done('Sent for approval')) },
    ];
  }
  if (bucket === 'mine') {
    return [
      view,
      { key: 'approve', header: 'Approve', label: 'Approve', onClick: (row) => approve.mutate({ id: row.id, data: { level: row.current_level ?? 1 } }, done('Approved')) },
      { key: 'reject', header: 'Reject', label: 'Reject', onClick: onReject },
    ];
  }
  if (bucket === 'level') {
    return [view, { key: 'withdraw', header: 'Withdraw', label: 'Withdraw', hidden: (row) => !mine(row), onClick: (row) => withdraw.mutate(row.id, done('Request withdrawn')) }];
  }
  if (bucket === 'closed' && canWriteFinance()) {
    return [
      view,
      {
        key: 'convert',
        header: 'Convert',
        label: 'Convert to invoice',
        hidden: (row) => row.status !== 'approved' || !row.vendor_id,
        href: CONVERT_PAGE,
      },
    ];
  }
  return [view];
}
