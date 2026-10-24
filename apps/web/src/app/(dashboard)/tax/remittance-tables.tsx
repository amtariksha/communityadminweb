'use client';

import { useState, type ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useChallans, useRemittances } from '@/hooks';
import { canWriteFinance } from '@/lib/finance-roles';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ReverseRemittanceDialog, type ReverseTarget } from './reverse-remittance-dialog';

interface RowState {
  is_reversed?: boolean;
  reversal_reason?: string | null;
}

/** Reversed (with its reason on hover), or Reverse for the finance writers. */
function ReverseCell({ row, target, canReverse, onReverse }: { row: RowState; target: ReverseTarget; canReverse: boolean; onReverse: (target: ReverseTarget) => void }): ReactNode {
  if (row.is_reversed) {
    return (
      <Badge variant="secondary" title={row.reversal_reason ?? undefined}>
        Reversed
      </Badge>
    );
  }
  if (!canReverse) return null;
  return (
    <Button type="button" variant="ghost" size="sm" className="h-8 p-1 text-xs" onClick={() => onReverse(target)}>
      Reverse
    </Button>
  );
}

function LoadingRows({ columns }: { columns: number }): ReactNode {
  return (
    <>
      {Array.from({ length: 3 }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: columns }).map((__, j) => (
            <TableCell key={j}>
              <Skeleton className="h-4 w-20" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

function EmptyRow({ columns, text }: { columns: number; text: string }): ReactNode {
  return (
    <TableRow>
      <TableCell colSpan={columns} className="py-6 text-center text-muted-foreground">
        {text}
      </TableCell>
    </TableRow>
  );
}

function RemittanceTableHead({ first, second }: { first: string; second: string }): ReactNode {
  return (
    <TableHeader>
      <TableRow>
        <TableHead>{first}</TableHead>
        <TableHead>{second}</TableHead>
        <TableHead>Date</TableHead>
        <TableHead className="text-right">Amount</TableHead>
        <TableHead className="w-24" />
      </TableRow>
    </TableHeader>
  );
}

/**
 * Taxes › TDS Challans and Remittances, each with Reverse (BANK-16): an
 * inverse entry for one that posted a journal; one recorded before
 * remittances posted journals (or PF / ESI / PT / other) is withdrawn from
 * the tax figures with no entry. A reversed row stays, marked Reversed.
 */
export function ChallansAndRemittances(): ReactNode {
  const challansQuery = useChallans();
  const remittancesQuery = useRemittances();
  const [reversing, setReversing] = useState<ReverseTarget | null>(null);
  const [canReverse] = useState(() => canWriteFinance());
  const challans = challansQuery.data ?? [];
  const remittances = remittancesQuery.data ?? [];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>TDS Challans</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <RemittanceTableHead first="Challan #" second="Section" />
            <TableBody>
              {challansQuery.isLoading ? (
                <LoadingRows columns={5} />
              ) : challans.length > 0 ? (
                challans.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs">{c.challan_number}</TableCell>
                    <TableCell>{c.tds_section}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(c.payment_date)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(c.amount)}</TableCell>
                    <TableCell>
                      <ReverseCell
                        row={c}
                        canReverse={canReverse}
                        onReverse={setReversing}
                        target={{ id: c.id, label: `Challan ${c.challan_number}`, hasEntry: Boolean(c.journal_entry_id) }}
                      />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <EmptyRow columns={5} text="No challans recorded." />
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Remittances (GST + TDS payments)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <RemittanceTableHead first="Type" second="Period" />
            <TableBody>
              {remittancesQuery.isLoading ? (
                <LoadingRows columns={5} />
              ) : remittances.length > 0 ? (
                remittances.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="uppercase font-mono text-xs">{r.type}</TableCell>
                    <TableCell>{r.period}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(r.payment_date)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(r.amount)}</TableCell>
                    <TableCell>
                      <ReverseCell
                        row={r}
                        canReverse={canReverse}
                        onReverse={setReversing}
                        target={{ id: r.id, label: `${r.type.toUpperCase()} remittance ${r.period}`, hasEntry: Boolean(r.journal_entry_id) }}
                      />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <EmptyRow columns={5} text="No remittances recorded." />
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {reversing && <ReverseRemittanceDialog target={reversing} onClose={() => setReversing(null)} />}
    </div>
  );
}
