'use client';

import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { useReconcileTransaction, useUnreconcileTransaction } from '@/hooks';
import type { BankRegisterRow } from '@/hooks/use-bank-register';
import { friendlyError } from '@/lib/api-error';
import { formatDate } from '@/lib/utils';

/**
 * The register's Reconcile cell (BANK-S3): a bank date (the posting date
 * by default) and Reconcile; a reconciled line shows its bank date and
 * Undo. No journal is posted either way.
 */
export function ReconcileCell({ row, canReconcile }: { row: BankRegisterRow; canReconcile: boolean }): ReactNode {
  const { addToast } = useToast();
  const reconcile = useReconcileTransaction();
  const unreconcile = useUnreconcileTransaction();
  const [bankDate, setBankDate] = useState(row.entry_date);
  const failed = (title: string) => (error: Error) => addToast({ title, description: friendlyError(error), variant: 'destructive' });

  if (row.is_reconciled) {
    return (
      <span className="flex items-center gap-2 whitespace-nowrap">
        {formatDate(row.bank_date)}
        {canReconcile && (
          <Button type="button" variant="link" size="sm" className="h-auto p-0" disabled={unreconcile.isPending} onClick={() => unreconcile.mutate(row.id, { onError: failed('Could not undo') })}>
            Undo
          </Button>
        )}
      </span>
    );
  }
  if (!canReconcile) return null;
  return (
    <span className="flex items-center gap-1">
      <Input type="date" aria-label={`Bank date for ${row.document_no}`} className="h-8 w-36" value={bankDate} onChange={(e) => setBankDate(e.target.value)} />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!bankDate || reconcile.isPending}
        onClick={() => reconcile.mutate({ id: row.id, data: { bank_date: bankDate } }, { onError: failed('Could not reconcile') })}
      >
        Reconcile
      </Button>
    </span>
  );
}
