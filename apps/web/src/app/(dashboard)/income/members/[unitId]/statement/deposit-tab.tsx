'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useFormMode } from '@/components/form-page';
import { Button, buttonVariants } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DepositFormView } from '@/components/unit-posting/deposit-form';
import { useFinanceAccess } from '@/hooks/use-finance-access';
import { useRefundableDeposits, type DepositStatus, type RefundableDeposit } from '@/hooks/use-refundable-deposits';
import { todayIST } from '@/lib/date';
import { isRouteMissing } from '@/lib/not-deployed';
import { formatCurrency, formatDate } from '@/lib/utils';
import { depositHref } from '../../member-row-actions';
import { AdjustDepositDialog, RefundDepositDialog } from './deposit-dialogs';
import { EmptyRow } from './summary-tabs';

const STATUS_LABELS: Readonly<Record<DepositStatus, string>> = {
  held: 'Held',
  partly_refunded: 'Partly refunded',
  refunded: 'Refunded',
  adjusted: 'Set against dues',
  voided: 'Voided',
};

/** A deposit can be refunded or set against dues while some of it is still held. */
export function depositActionable(deposit: Pick<RefundableDeposit, 'status' | 'held'>): boolean {
  return (deposit.status === 'held' || deposit.status === 'partly_refunded') && Number(deposit.held) > 0;
}

type Pending = { kind: 'refund' | 'adjust'; deposit: RefundableDeposit } | null;

function DepositRow({ deposit, canWrite, onAction }: { deposit: RefundableDeposit; canWrite: boolean; onAction: (pending: Pending) => void }): ReactNode {
  const money = (value: string): string => formatCurrency(Number(value));
  return (
    <TableRow>
      <TableCell className="font-mono text-xs">{deposit.receipt_number}</TableCell>
      <TableCell>{formatDate(deposit.receipt_date)}</TableCell>
      <TableCell className="text-right">{money(deposit.amount)}</TableCell>
      <TableCell className="text-right">{money(deposit.refunded_amount)}</TableCell>
      <TableCell className="text-right">{money(deposit.adjusted_amount)}</TableCell>
      <TableCell className="text-right font-medium">{money(deposit.held)}</TableCell>
      <TableCell>{STATUS_LABELS[deposit.status]}</TableCell>
      <TableCell>{deposit.description ?? ''}</TableCell>
      <TableCell className="space-x-1 whitespace-nowrap">
        {canWrite && depositActionable(deposit) && (
          <>
            <Button type="button" variant="outline" size="sm" aria-label={`Refund ${deposit.receipt_number}`} onClick={() => onAction({ kind: 'refund', deposit })}>
              Refund
            </Button>
            <Button type="button" variant="outline" size="sm" aria-label={`Set ${deposit.receipt_number} against dues`} onClick={() => onAction({ kind: 'adjust', deposit })}>
              Set against dues
            </Button>
          </>
        )}
      </TableCell>
    </TableRow>
  );
}

function PostDepositButton({ unitId, onOpen }: { unitId: string; onOpen: () => void }): ReactNode {
  if (useFormMode() === 'page') {
    return (
      <Link href={depositHref(unitId)} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
        Post a Refundable Deposit
      </Link>
    );
  }
  return (
    <Button type="button" variant="outline" size="sm" onClick={onOpen}>
      Post a Refundable Deposit
    </Button>
  );
}

/**
 * Refundable Deposit tab of a unit's statement (INC-S17, INC-47): each
 * deposit with what was refunded, set against dues and is still held;
 * Refund and Set against dues for the finance writers.
 */
export function RefundableDepositTab({ unitId }: { unitId: string }): ReactNode {
  const access = useFinanceAccess();
  const deposits = useRefundableDeposits(unitId);
  const [pending, setPending] = useState<Pending>(null);
  const [taking, setTaking] = useState(false);
  if (isRouteMissing(deposits.error)) return <p className="text-sm text-muted-foreground">Refundable deposits are not available yet on this server.</p>;
  const rows = deposits.data ?? [];
  return (
    <div className="space-y-3">
      {access.canWrite && <PostDepositButton unitId={unitId} onOpen={() => setTaking(true)} />}
      <Table aria-label="Refundable deposits">
        <TableHeader>
          <TableRow>
            <TableHead>Receipt No</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-right">Refunded</TableHead>
            <TableHead className="text-right">Adjusted</TableHead>
            <TableHead className="text-right">Held</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && <EmptyRow span={9} text={deposits.isLoading ? 'Loading…' : 'No refundable deposit is recorded for this unit.'} />}
          {rows.map((deposit) => (
            <DepositRow key={deposit.id} deposit={deposit} canWrite={access.canWrite} onAction={setPending} />
          ))}
        </TableBody>
      </Table>
      {pending?.kind === 'refund' && <RefundDepositDialog deposit={pending.deposit} onClose={() => setPending(null)} />}
      {pending?.kind === 'adjust' && <AdjustDepositDialog deposit={pending.deposit} onClose={() => setPending(null)} />}
      {taking && <DepositFormView unitId={unitId} mode="dialog" open today={todayIST()} onClose={() => setTaking(false)} onPosted={() => setTaking(false)} />}
    </div>
  );
}
