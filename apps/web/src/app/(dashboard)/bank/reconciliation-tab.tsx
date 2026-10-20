'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { FileCheck, Undo2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/components/ui/toast';
import {
  useBRSSummary,
  useReconcileTransaction,
  useReconciliation,
  useSaveStatementBalance,
  useUnreconcileTransaction,
} from '@/hooks';
import type { ReconciliationRow } from '@/hooks/use-bank';
import { friendlyError } from '@/lib/api-error';
import { todayIST } from '@/lib/date';
import { formatCurrency, formatDate } from '@/lib/utils';

interface ReconciliationTabProps {
  accounts: ReadonlyArray<{ id: string; bank_name: string; account_number: string | null }>;
}

type LineFilter = 'all' | 'unreconciled' | 'reconciled';

const firstOfMonth = (isoDate: string): string => `${isoDate.slice(0, 7)}-01`;

/**
 * Bank & Cash › reconciliation (BANK-02). The bank account's lines for a
 * period, each with the date the bank value-dated it: tick a line with its
 * bank date, or undo it. The bank balance (opening balance plus the lines the
 * bank has reflected) moves with the ticks; the book balance does not. A
 * statement's closing balance is logged against it to show what is left to
 * explain. Nothing here posts a journal.
 */
export function ReconciliationTab({ accounts }: ReconciliationTabProps): ReactNode {
  const { addToast } = useToast();
  const [accountId, setAccountId] = useState('');
  const [startDate, setStartDate] = useState(() => firstOfMonth(todayIST()));
  const [endDate, setEndDate] = useState(() => todayIST());
  const [filter, setFilter] = useState<LineFilter>('all');
  // Bank date typed per line, keyed by journal line id.
  const [bankDates, setBankDates] = useState<Record<string, string>>({});
  const [statementDate, setStatementDate] = useState('');
  const [statementBalance, setStatementBalance] = useState('');

  const registerQuery = useReconciliation(accountId, startDate, endDate);
  const summaryQuery = useBRSSummary(accountId);
  const reconcile = useReconcileTransaction();
  const unreconcile = useUnreconcileTransaction();
  const saveStatement = useSaveStatementBalance();

  const register = registerQuery.data;
  const summary = summaryQuery.data;
  const rows = (register?.rows ?? []).filter(
    (row) => filter === 'all' || (filter === 'reconciled') === row.is_reconciled,
  );

  function handleReconcile(row: ReconciliationRow): void {
    const bankDate = bankDates[row.id];
    if (!bankDate) return;
    reconcile.mutate(
      { id: row.id, data: { bank_date: bankDate } },
      {
        onSuccess() {
          setBankDates((prev) => ({ ...prev, [row.id]: '' }));
          addToast({ title: 'Line reconciled', variant: 'success' });
        },
        onError(error) {
          addToast({ title: 'Failed to reconcile', description: friendlyError(error), variant: 'destructive' });
        },
      },
    );
  }

  function handleUndo(row: ReconciliationRow): void {
    unreconcile.mutate(row.id, {
      onSuccess() {
        addToast({ title: 'Reconciliation undone', variant: 'success' });
      },
      onError(error) {
        addToast({ title: 'Failed to undo', description: friendlyError(error), variant: 'destructive' });
      },
    });
  }

  function handleSaveStatement(e: FormEvent): void {
    e.preventDefault();
    saveStatement.mutate(
      { accountId, statement_date: statementDate, statement_balance: Number(statementBalance) },
      {
        onSuccess() {
          setStatementDate('');
          setStatementBalance('');
          addToast({ title: 'Statement balance saved', variant: 'success' });
        },
        onError(error) {
          addToast({ title: 'Failed to save the statement balance', description: friendlyError(error), variant: 'destructive' });
        },
      },
    );
  }

  const last = summary?.last_statement ?? null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Bank Reconciliation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label htmlFor="recon-account">Bank Account</Label>
              <Select
                id="recon-account"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-64"
              >
                <option value="">Select bank account</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.bank_name} - {account.account_number}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="recon-start">From</Label>
              <Input id="recon-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recon-end">To</Label>
              <Input id="recon-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recon-filter">Show</Label>
              <Select id="recon-filter" value={filter} onChange={(e) => setFilter(e.target.value as LineFilter)} className="w-44">
                <option value="all">All lines</option>
                <option value="unreconciled">Unreconciled</option>
                <option value="reconciled">Reconciled</option>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {accountId && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <SummaryCard title="Book Balance" value={formatCurrency(register?.book_balance ?? summary?.book_balance ?? 0)} />
            <SummaryCard title="Bank Balance" value={formatCurrency(register?.bank_balance ?? summary?.bank_balance ?? 0)} />
            <SummaryCard
              title="Difference"
              value={last ? formatCurrency(last.difference) : '—'}
              tone={last ? (last.difference !== 0 ? 'bad' : 'good') : undefined}
              note={last ? `Statement balance of ${formatCurrency(last.balance)} on ${formatDate(last.date)}, less the bank balance` : 'Enter a statement balance below'}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Statement balance</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveStatement} className="flex flex-wrap items-end gap-4">
                <div className="space-y-2">
                  <Label htmlFor="recon-stmt-date">Statement date</Label>
                  <Input id="recon-stmt-date" type="date" required value={statementDate} onChange={(e) => setStatementDate(e.target.value)} className="w-40" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="recon-stmt-balance">Statement balance</Label>
                  <Input id="recon-stmt-balance" type="number" step="0.01" required placeholder="0.00" value={statementBalance} onChange={(e) => setStatementBalance(e.target.value)} className="w-44" />
                </div>
                <Button type="submit" disabled={saveStatement.isPending || !statementDate || statementBalance === ''}>
                  Save statement balance
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              {registerQuery.isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : rows.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Document</TableHead>
                      <TableHead>Instrument</TableHead>
                      <TableHead>Particulars</TableHead>
                      <TableHead className="text-right">Deposit</TableHead>
                      <TableHead className="text-right">Withdrawal</TableHead>
                      <TableHead>Bank Date</TableHead>
                      <TableHead className="w-28">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="text-muted-foreground">{formatDate(row.entry_date)}</TableCell>
                        <TableCell className="font-mono text-xs">{row.document_no}</TableCell>
                        <TableCell className="text-xs">{row.instrument_no ?? '—'}</TableCell>
                        <TableCell className="font-medium">{row.narration}</TableCell>
                        <TableCell className="text-right">{row.amount > 0 ? formatCurrency(row.amount) : '—'}</TableCell>
                        <TableCell className="text-right">{row.amount < 0 ? formatCurrency(-row.amount) : '—'}</TableCell>
                        {row.is_reconciled ? (
                          <>
                            <TableCell>{formatDate(row.bank_date)}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm" className="h-8 p-1 text-xs" onClick={() => handleUndo(row)} disabled={unreconcile.isPending}>
                                <Undo2 className="mr-1 h-3 w-3" />
                                Undo
                              </Button>
                            </TableCell>
                          </>
                        ) : (
                          <>
                            <TableCell>
                              <Input
                                type="date"
                                aria-label={`Bank date for ${row.document_no}`}
                                value={bankDates[row.id] ?? ''}
                                onChange={(e) => setBankDates((prev) => ({ ...prev, [row.id]: e.target.value }))}
                                className="h-8 w-36"
                              />
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 p-1 text-xs"
                                onClick={() => handleReconcile(row)}
                                disabled={!bankDates[row.id] || reconcile.isPending}
                              >
                                <FileCheck className="mr-1 h-3 w-3" />
                                Reconcile
                              </Button>
                            </TableCell>
                          </>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FileCheck className="mb-4 h-12 w-12 text-muted-foreground" />
                  <p className="text-lg font-medium">No transactions in this period</p>
                  <p className="text-sm text-muted-foreground">Change the dates or the filter to see other lines</p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function SummaryCard({
  title,
  value,
  tone,
  note,
}: {
  title: string;
  value: string;
  tone?: 'good' | 'bad';
  note?: string;
}): ReactNode {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`text-2xl font-bold ${tone === 'bad' ? 'text-destructive' : tone === 'good' ? 'text-success' : ''}`}>
          {value}
        </p>
        {note && <p className="mt-1 text-xs text-muted-foreground">{note}</p>}
      </CardContent>
    </Card>
  );
}
