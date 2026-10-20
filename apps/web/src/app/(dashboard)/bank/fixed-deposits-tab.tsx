'use client';

import { useState, type ReactNode } from 'react';
import { Calendar, PiggyBank, Plus, RefreshCw } from 'lucide-react';
import type { LedgerAccount } from '@communityos/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/toast';
import { useFixedDeposits, useMatureFD } from '@/hooks';
import { friendlyError } from '@/lib/api-error';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  computeDaysToMaturity,
  getFDStatusVariant,
  inFdScope,
  type BankAccountRow,
  type FdScope,
  type FixedDepositRow,
} from './bank-types';
import { CreateFdDialog, RenewFdDialog } from './fd-dialogs';
import { ArchiveFdDialog } from './fd-archive-dialog';
import Link from 'next/link';

const HEADERS = ['FD #', 'Bank', 'Principal', 'Rate', 'Start Date', 'Maturity Date', 'Maturity Amt', 'Status', 'Days Left', 'Actions'];
const RIGHT = new Set(['Principal', 'Rate', 'Maturity Amt', 'Days Left']);
const EMPTY_TEXT: Readonly<Record<FdScope, string>> = {
  all: 'No fixed deposits',
  active: 'No active fixed deposits.',
  archived: 'No archived fixed deposits.',
};

function FdActions({ fd, onMature, onRenew, onArchive, maturing }: { fd: FixedDepositRow; onMature: () => void; onRenew: () => void; onArchive: () => void; maturing: boolean }): ReactNode {
  const daysLeft = computeDaysToMaturity(String(fd.maturity_date));
  // BANK-11: Archive any FD not archived yet (an active one by early withdrawal).
  const archive = !fd.archived_at && fd.status !== 'withdrawn' && (
    <Button variant="ghost" size="sm" className="h-8 p-1 text-xs" onClick={onArchive}>Archive</Button>
  );
  // QA #103 — Renew within 30 days of maturity or after; Mature once due.
  if (fd.status !== 'active' && fd.status !== 'matured') return <div className="flex gap-1">{archive}</div>;
  return (
    <div className="flex gap-1">
      {archive}
      {fd.status === 'active' && daysLeft <= 0 && (
        <Button variant="ghost" size="sm" className="h-8 p-1 text-xs" disabled={maturing} onClick={onMature}>
          <Calendar className="mr-1 h-3 w-3" /> Mature
        </Button>
      )}
      {daysLeft <= 30 && (
        <Button variant="ghost" size="sm" className="h-8 p-1 text-xs" onClick={onRenew}>
          <RefreshCw className="mr-1 h-3 w-3" /> Renew
        </Button>
      )}
    </div>
  );
}

function FdRow({ fd, children }: { fd: FixedDepositRow; children: ReactNode }): ReactNode {
  const daysLeft = computeDaysToMaturity(String(fd.maturity_date));
  return (
    <TableRow>
      <TableCell><span className="font-mono text-xs">{fd.fd_number}</span></TableCell>
      <TableCell className="font-medium">{fd.bank_name ?? '-'}</TableCell>
      <TableCell className="text-right">{formatCurrency(fd.principal_amount)}</TableCell>
      <TableCell className="text-right">{fd.interest_rate}%</TableCell>
      <TableCell className="text-muted-foreground">{formatDate(String(fd.start_date))}</TableCell>
      <TableCell className="text-muted-foreground">{formatDate(String(fd.maturity_date))}</TableCell>
      <TableCell className="text-right font-medium">{formatCurrency(fd.maturity_amount)}</TableCell>
      <TableCell><Badge variant={getFDStatusVariant(fd.status)}>{fd.status}</Badge></TableCell>
      <TableCell className="text-right">
        {fd.status === 'active' ? <span className={daysLeft <= 30 ? 'font-medium text-warning' : ''}>{daysLeft > 0 ? daysLeft : 'Overdue'}</span> : '-'}
      </TableCell>
      <TableCell>{children}</TableCell>
    </TableRow>
  );
}

interface FixedDepositsTabProps {
  accounts: readonly BankAccountRow[];
  ledgerAccounts: readonly LedgerAccount[];
  /** Classic: Active or Archived Fixed Deposits (BANK-S8); standard: all. */
  scope?: FdScope;
}

/** Fixed deposits with Create, Mature and Renew; one list in standard, Active / Archived in classic. */
export function FixedDepositsTab({ accounts, ledgerAccounts, scope = 'all' }: FixedDepositsTabProps): ReactNode {
  const { addToast } = useToast();
  const fdQuery = useFixedDeposits();
  const matureFD = useMatureFD();
  const [creating, setCreating] = useState(false);
  const [renewing, setRenewing] = useState<string | null>(null);
  const [archiving, setArchiving] = useState<FixedDepositRow | null>(null);
  const deposits = ((fdQuery.data ?? []) as unknown as FixedDepositRow[]).filter((fd) => inFdScope(fd.status, scope));

  const mature = (id: string) =>
    matureFD.mutate(id, {
      onSuccess: () => addToast({ title: 'Fixed deposit matured', variant: 'success' }),
      onError: (error) => addToast({ title: 'Failed to mature FD', description: friendlyError(error), variant: 'destructive' }),
    });

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-lg">Fixed Deposits</CardTitle>
          <div className="flex flex-wrap items-center gap-3">
            {/* BANK-S8: move money between asset ledgers and FDs with a journal. */}
            <Link href="/general-ledger/journal-entries/create" className="text-sm text-primary underline">Pass journal entries between assets and FDs</Link>
            <Button onClick={() => setCreating(true)}><Plus className="mr-2 h-4 w-4" /> Create FD</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {fdQuery.isLoading || deposits.length > 0 ? (
          <Table aria-label="Fixed deposits">
            <TableHeader>
              <TableRow>
                {HEADERS.map((header) => <TableHead key={header} className={RIGHT.has(header) ? 'text-right' : undefined}>{header}</TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {fdQuery.isLoading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>{HEADERS.map((header) => <TableCell key={header}><Skeleton className="h-4 w-16" /></TableCell>)}</TableRow>
                  ))
                : deposits.map((fd) => (
                    <FdRow key={fd.id} fd={fd}>
                      <FdActions fd={fd} maturing={matureFD.isPending} onMature={() => mature(fd.id)} onRenew={() => setRenewing(fd.id)} onArchive={() => setArchiving(fd)} />
                    </FdRow>
                  ))}
            </TableBody>
          </Table>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <PiggyBank className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium">{EMPTY_TEXT[scope]}</p>
            {scope === 'all' && <p className="text-sm text-muted-foreground">Create a fixed deposit to track investments</p>}
          </div>
        )}
      </CardContent>
      <CreateFdDialog open={creating} onOpenChange={setCreating} accounts={accounts} ledgerAccounts={ledgerAccounts} />
      <RenewFdDialog fdId={renewing} onClose={() => setRenewing(null)} />
      <ArchiveFdDialog fd={archiving} onClose={() => setArchiving(null)} />
    </Card>
  );
}
