'use client';

import { useState, type ReactNode } from 'react';
import { ArrowRightLeft, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useBankTransfers } from '@/hooks';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { BankAccountRow, BankTransferRow } from './bank-types';
import { TransferDialog } from './transfer-form';

const ITEMS_PER_PAGE = 20;

function TransferTableSkeleton(): ReactNode {
  return Array.from({ length: 6 }).map((_, i) => (
    <TableRow key={i}>
      {Array.from({ length: 6 }).map((__, j) => (
        <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
      ))}
    </TableRow>
  ));
}

function TransferRows({ transfers }: { transfers: readonly BankTransferRow[] }): ReactNode {
  return transfers.map((xfer) => (
    <TableRow key={xfer.id}>
      <TableCell className="text-muted-foreground">{formatDate(String(xfer.transfer_date))}</TableCell>
      <TableCell className="font-medium">{xfer.from_account_name ?? xfer.from_account_id?.slice(0, 8) ?? '-'}</TableCell>
      <TableCell className="font-medium">{xfer.to_account_name ?? xfer.to_account_id?.slice(0, 8) ?? '-'}</TableCell>
      <TableCell className="text-right font-medium">{formatCurrency(xfer.amount)}</TableCell>
      <TableCell className="font-mono text-xs text-muted-foreground">{xfer.reference_number ?? '-'}</TableCell>
      {/* QA #293 — the column is `notes`; fall back to the legacy key. */}
      <TableCell className="text-muted-foreground">{xfer.notes ?? xfer.narration ?? '-'}</TableCell>
    </TableRow>
  ));
}

function Pager({ page, pages, total, onPage }: { page: number; pages: number; total: number; onPage: (page: number) => void }): ReactNode {
  if (pages <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-between border-t pt-4">
      <p className="text-sm text-muted-foreground">Page {page} of {pages} ({total} total)</p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          <ChevronLeft className="mr-1 h-4 w-4" /> Previous
        </Button>
        <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          Next <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

/** /bank › Transfers (standard): date filters, the list and the Create Transfer dialog. */
export function TransfersTab({ accounts }: { accounts: readonly BankAccountRow[] }): ReactNode {
  const [page, setPage] = useState(1);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [creating, setCreating] = useState(false);
  const query = useBankTransfers({ start_date: start || undefined, end_date: end || undefined, page, limit: ITEMS_PER_PAGE });
  const transfers = (query.data?.data ?? []) as unknown as BankTransferRow[];
  const total = query.data?.total ?? 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-lg">Inter-Account Transfers</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Input type="date" aria-label="From date" value={start} onChange={(e) => { setStart(e.target.value); setPage(1); }} className="w-36" />
            <span className="text-muted-foreground">to</span>
            <Input type="date" aria-label="To date" value={end} onChange={(e) => { setEnd(e.target.value); setPage(1); }} className="w-36" />
            <Button onClick={() => setCreating(true)}>
              <Plus className="mr-2 h-4 w-4" /> New Transfer
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>From Account</TableHead>
              <TableHead>To Account</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Narration</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{query.isLoading ? <TransferTableSkeleton /> : <TransferRows transfers={transfers} />}</TableBody>
        </Table>
        {!query.isLoading && transfers.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <ArrowRightLeft className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium">No transfers found</p>
            <p className="text-sm text-muted-foreground">Record an inter-account transfer to see it here</p>
          </div>
        )}
        <Pager page={page} pages={Math.max(1, Math.ceil(total / ITEMS_PER_PAGE))} total={total} onPage={setPage} />
      </CardContent>
      <TransferDialog open={creating} onOpenChange={setCreating} accounts={accounts} />
    </Card>
  );
}
