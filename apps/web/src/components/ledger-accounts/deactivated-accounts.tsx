'use client';

import { type ReactNode } from 'react';
import type { AccountType } from '@communityos/shared';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/toast';
import {
  useActivateLedgerAccount,
  useDeactivatedAccounts,
  useDeleteLedgerAccount,
  type ChartAccount,
} from '@/hooks/use-chart-of-accounts';
import { ApiError, friendlyError } from '@/lib/api-error';
import { formatDate } from '@/lib/utils';

interface DeactivatedAccountsProps {
  types: readonly AccountType[];
  heading: string;
  canChange: boolean;
}

// An API older than GL-14 has no deactivate / activate / delete route.
export function accountActionError(error: unknown): string {
  if (error instanceof ApiError && error.status === 404) return 'This is not available yet on this server.';
  return friendlyError(error);
}

function DeactivatedRow({ account, canChange }: { account: ChartAccount; canChange: boolean }): ReactNode {
  const { addToast } = useToast();
  const activate = useActivateLedgerAccount();
  const remove = useDeleteLedgerAccount();
  const busy = activate.isPending || remove.isPending;

  function onActivate(): void {
    activate.mutate(account.id, {
      onSuccess: () => addToast({ title: `${account.name} is active again`, variant: 'success' }),
      onError: (error) => addToast({ title: 'Could not activate the account', description: accountActionError(error), variant: 'destructive' }),
    });
  }

  function onDelete(): void {
    if (!window.confirm(`Delete ${account.name}? Only an account that was never posted to can be deleted.`)) return;
    remove.mutate(account.id, {
      onSuccess: () => addToast({ title: `${account.name} deleted`, variant: 'success' }),
      onError: (error) => addToast({ title: 'Could not delete the account', description: accountActionError(error), variant: 'destructive' }),
    });
  }

  return (
    <TableRow>
      <TableCell>{account.code ?? '—'}</TableCell>
      <TableCell>{account.name}</TableCell>
      <TableCell>{account.deactivated_by_name ?? '—'}</TableCell>
      <TableCell>{formatDate(account.deactivated_at ?? null)}</TableCell>
      <TableCell>
        {canChange && (
          <Button type="button" size="sm" variant="outline" disabled={busy} aria-label={`Activate ${account.name}`} onClick={onActivate}>
            Activate
          </Button>
        )}
      </TableCell>
      <TableCell>
        {canChange && !account.is_system && (
          <Button type="button" size="sm" variant="outline" disabled={busy} aria-label={`Delete ${account.name}`} onClick={onDelete}>
            Delete
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}

/**
 * Deactivated accounts of a chart-of-accounts tab (GL-14, screens GL-S1 to
 * GL-S4): who retired each one and when, with Activate and Delete (the API
 * deletes only an account never posted to). Shown only when it has rows.
 */
export function DeactivatedAccounts({ types, heading, canChange }: DeactivatedAccountsProps): ReactNode {
  const query = useDeactivatedAccounts(types);
  const accounts = (query.data ?? []).filter((account) => account.is_active === false);
  if (accounts.length === 0) return null;
  return (
    <section className="space-y-2">
      <h3 className="font-semibold">{heading}</h3>
      <Table aria-label={heading}>
        <TableHeader>
          <TableRow>
            <TableHead>GL No.</TableHead>
            <TableHead>Account Name</TableHead>
            <TableHead>DeActivated By</TableHead>
            <TableHead>DeActivated On</TableHead>
            <TableHead>Activate</TableHead>
            <TableHead>Delete</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {accounts.map((account) => (
            <DeactivatedRow key={account.id} account={account} canChange={canChange} />
          ))}
        </TableBody>
      </Table>
    </section>
  );
}
