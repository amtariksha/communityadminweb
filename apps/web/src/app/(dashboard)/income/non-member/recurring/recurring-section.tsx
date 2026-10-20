'use client';

import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/toast';
import { useFinanceAccess } from '@/hooks/use-finance-access';
import { useRecurringInvoices, useUpdateRecurringInvoice, type RecurringInvoice } from '@/hooks/use-recurring-invoices';
import { friendlyError } from '@/lib/api-error';
import { todayIST } from '@/lib/date';
import { isRouteMissing } from '@/lib/not-deployed';
import { formatCurrency, formatDate } from '@/lib/utils';
import { RecurringDialog } from './recurring-dialog';
import { FREQUENCY_LABELS } from './recurring-form';
import { RecurringRuns } from './recurring-runs';

function stateOf(row: RecurringInvoice): string {
  if (!row.is_active) return 'Stopped';
  return row.ended ? 'Ended' : 'Active';
}

/**
 * A payer's Recurring invoices (INC-66): what is raised for them on a
 * schedule, its next date, and its runs. Finance writers set one up, stop
 * or resume it; a resumed one picks up on its next date from today.
 */
export function RecurringSection({ customerId }: { customerId: string }): ReactNode {
  const access = useFinanceAccess();
  const { addToast } = useToast();
  const query = useRecurringInvoices(customerId);
  const update = useUpdateRecurringInvoice();
  const [adding, setAdding] = useState(false);
  const [viewing, setViewing] = useState<RecurringInvoice | null>(null);

  if (isRouteMissing(query.error)) return <p className="text-sm text-muted-foreground">Recurring invoices are not available yet on this server.</p>;
  const rows = query.data ?? [];
  const toggle = (row: RecurringInvoice) =>
    update.mutate({ id: row.id, is_active: !row.is_active }, { onError: (error) => addToast({ title: 'Not saved', description: friendlyError(error), variant: 'destructive' }) });
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Recurring invoices</CardTitle>
        {access.canWrite && <Button type="button" size="sm" onClick={() => setAdding(true)}>Add recurring invoice</Button>}
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{query.isLoading ? 'Loading…' : 'Nothing is invoiced on a schedule for this payer.'}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {['For', 'Amount', 'Frequency', 'Next', 'Ends', 'Post', 'Status', ''].map((header) => <TableHead key={header}>{header}</TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.lines.map((line) => line.description).join(', ')}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row.amount)}</TableCell>
                  <TableCell>{FREQUENCY_LABELS[row.frequency]}</TableCell>
                  <TableCell>{row.ended ? '—' : formatDate(row.next_run_date)}</TableCell>
                  <TableCell>{row.end_date ? formatDate(row.end_date) : '—'}</TableCell>
                  <TableCell>{row.auto_post ? 'Yes' : 'Draft'}</TableCell>
                  <TableCell>{stateOf(row)}</TableCell>
                  <TableCell className="space-x-2 whitespace-nowrap">
                    <Button type="button" size="sm" variant="outline" onClick={() => setViewing(row)}>Runs</Button>
                    {access.canWrite && (
                      <Button type="button" size="sm" variant="outline" disabled={update.isPending} onClick={() => toggle(row)}>
                        {row.is_active ? 'Stop' : 'Resume'}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
      {adding && <RecurringDialog customerId={customerId} today={todayIST()} onClose={() => setAdding(false)} />}
      {viewing && <RecurringRuns schedule={viewing} canWrite={access.canWrite} onClose={() => setViewing(null)} />}
    </Card>
  );
}
