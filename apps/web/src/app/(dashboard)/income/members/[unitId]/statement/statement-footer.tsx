'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Button, buttonVariants } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import {
  statementParams,
  statementPath,
  useReallocateFifo,
  type ReallocationResult,
  type StatementFilters,
  type StatementParty,
  type UnitStatement,
} from '@/hooks/use-unit-statement';
import { api } from '@/lib/api';
import { ApiError, friendlyError } from '@/lib/api-error';
import { saveBlob } from '@/lib/download';
import { exportLabel } from './statement-actions';
import { StatementEmailDialog } from './statement-email-dialog';

type FileFormat = 'csv' | 'xlsx' | 'pdf';

function notAvailable(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}

function describeReallocation(result: ReallocationResult): string {
  if (!result.changed) return 'Payments already sit on the oldest bills; nothing changed.';
  const bills = result.bills_changed.length;
  return `${bills} bill${bills === 1 ? '' : 's'} changed; advance now ₹${result.advance_after.toLocaleString('en-IN')}.`;
}

interface StatementFooterProps {
  party: StatementParty;
  statement: UnitStatement;
  filters: StatementFilters;
  canWrite: boolean;
  closeHref: string;
}

/**
 * Export, Send Email (INC-22), Auto Allocate on FiFo Basis (a unit's only:
 * a payer holds no advance), Print and Close under the statement (INC-S17,
 * INC-46).
 */
export function StatementFooter({ party, statement, filters, canWrite, closeHref }: StatementFooterProps): ReactNode {
  const { addToast } = useToast();
  const reallocate = useReallocateFifo();
  const [confirming, setConfirming] = useState(false);
  const [emailing, setEmailing] = useState(false);
  const [busy, setBusy] = useState<FileFormat | null>(null);

  async function download(format: FileFormat): Promise<void> {
    setBusy(format);
    try {
      const blob = await api.download(statementPath(party), { params: statementParams(filters, format) });
      saveBlob(blob, `statement.${format}`);
    } catch (error) {
      const description = notAvailable(error) ? 'The statement file is not available yet on this server.' : friendlyError(error);
      addToast({ title: 'Could not download', description, variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  }

  function runReallocation(): void {
    if (party.kind !== 'unit') return;
    reallocate.mutate(
      { unitId: party.id, scope: filters.scope },
      {
        onSuccess: (response) => {
          setConfirming(false);
          addToast({ title: 'Re-allocated oldest-first', description: describeReallocation(response.data), variant: 'success' });
        },
        onError: (error) => {
          const description = notAvailable(error) ? 'Auto Allocate is not available yet on this server.' : friendlyError(error);
          addToast({ title: 'Could not re-allocate', description, variant: 'destructive' });
        },
      },
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted-foreground">{exportLabel(statement.rows.length)}:</span>
      <Button type="button" variant="outline" size="sm" disabled={busy !== null} onClick={() => void download('csv')}>
        CSV
      </Button>
      <Button type="button" variant="outline" size="sm" disabled={busy !== null} onClick={() => void download('xlsx')}>
        Excel
      </Button>
      {canWrite && (
        <Button type="button" variant="outline" size="sm" onClick={() => setEmailing(true)}>
          Send Email
        </Button>
      )}
      {canWrite && party.kind === 'unit' && (
        <Button type="button" variant="outline" size="sm" onClick={() => setConfirming(true)}>
          Auto Allocate on FiFo Basis
        </Button>
      )}
      <Button type="button" variant="outline" size="sm" disabled={busy !== null} onClick={() => void download('pdf')}>
        Print
      </Button>
      <Link href={closeHref} className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
        Close
      </Link>
      {emailing && <StatementEmailDialog party={party} statement={statement} scope={filters.scope} onClose={() => setEmailing(false)} />}
      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Auto Allocate on FiFo Basis</DialogTitle>
            <DialogDescription>Re-assign all payments of this unit to bills oldest-first?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="button" onClick={runReallocation} disabled={reallocate.isPending}>
              {reallocate.isPending ? 'Re-allocating...' : 'Re-allocate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
