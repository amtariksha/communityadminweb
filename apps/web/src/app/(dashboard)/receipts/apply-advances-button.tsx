'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { useAdvances, useApplyAdvancesFifo, type ApplyAdvancesFifoResult } from '@/hooks';
import { ApiError, friendlyError } from '@/lib/api-error';
import { getCurrentTenant, getUser } from '@/lib/auth';
import { formatCurrency } from '@/lib/utils';
import { summarizeAdvances } from './receipt-allocation';

// Mirrors the API's @Roles on POST /receipts/advances/apply-fifo. UI
// shaping only — the server enforces it.
const FINANCE_WRITE_ROLES = new Set([
  'super_admin',
  'community_admin',
  'committee_member',
  'accountant',
]);

function currentRole(): string | null {
  const user = getUser();
  if (!user) return null;
  if (user.isSuperAdmin) return 'super_admin';
  const tenantId = getCurrentTenant();
  const tenancy = tenantId ? user.societies.find((s) => s.id === tenantId) : undefined;
  return tenancy?.role ?? user.role ?? null;
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

function describeResult(result: ApplyAdvancesFifoResult): string {
  const applied =
    result.amount_applied > 0
      ? `Applied ${formatCurrency(result.amount_applied)} to open invoices across ${plural(result.units_processed, 'unit')}.`
      : 'No unit has both an unapplied advance and an open invoice.';
  const failed =
    result.units_failed > 0
      ? ` ${plural(result.units_failed, 'unit')} could not be updated — run it again.`
      : '';
  return applied + failed;
}

/**
 * INC-03 — moves advances stranded by receipts recorded before FIFO
 * allocation onto each unit's open posted invoices, oldest first.
 */
export function ApplyAdvancesButton(): ReactNode {
  const { addToast } = useToast();
  // Read after mount: the role lives in localStorage, which the server
  // render cannot see.
  const [role, setRole] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    setRole(currentRole());
  }, []);
  const canApply = role !== null && FINANCE_WRITE_ROLES.has(role);
  const advancesQuery = useAdvances(undefined, { enabled: canApply && open });
  const applyAdvances = useApplyAdvancesFifo();

  if (!canApply) return null;

  const { unitCount, total } = summarizeAdvances(advancesQuery.data?.data ?? []);
  const counting = advancesQuery.isLoading;

  function handleApply(): void {
    applyAdvances.mutate(
      {},
      {
        onSuccess(response) {
          setOpen(false);
          const result = response.data;
          addToast({
            title: 'Advances applied',
            description: describeResult(result),
            variant: result.units_failed > 0 ? 'warning' : 'success',
          });
        },
        onError(error) {
          addToast({
            title: 'Failed to apply advances',
            description:
              error instanceof ApiError && error.status === 404
                ? 'The server does not support this yet — the API update needs to be deployed.'
                : friendlyError(error),
            variant: 'destructive',
          });
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <Button variant="outline">Apply advances to open invoices</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Apply advances to open invoices</DialogTitle>
          <DialogDescription>
            Each unit&apos;s advances settle its open posted invoices, oldest first. Units
            with no open invoice keep their advance.
          </DialogDescription>
        </DialogHeader>
        <p className="py-4 text-sm">
          {counting
            ? 'Counting units with unapplied advances…'
            : unitCount === 0
              ? 'No unit holds an unapplied advance.'
              : `${plural(unitCount, 'unit')} ${unitCount === 1 ? 'holds' : 'hold'} ${formatCurrency(total)} in unapplied advances.`}
        </p>
        <DialogFooter>
          <DialogClose>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="button"
            onClick={handleApply}
            disabled={applyAdvances.isPending || counting || unitCount === 0}
          >
            {applyAdvances.isPending ? 'Applying...' : 'Apply advances'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
