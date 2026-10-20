'use client';

import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/toast';
import { useReallocateUnitsBatch, useReverseBillingRun } from '@/hooks/use-income-corrections';
import { useBillingRuns } from '@/hooks/use-invoices';
import { useUnitDues } from '@/hooks/use-unit-ledger';
import { friendlyError } from '@/lib/api-error';
import { isRouteMissing } from '@/lib/not-deployed';
import { formatCurrency, formatDate } from '@/lib/utils';

/** INC-61 — Auto Allocate on FiFo Basis (INC-28) for the chosen units. */
export function ReallocateCorrection({ allowed }: { allowed: boolean }): ReactNode {
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const units = useUnitDues({ block: null, q, q_field: 'any', scope: 'member', page: 1, limit: 100 });
  const reallocate = useReallocateUnitsBatch();
  const { addToast: toast } = useToast();
  const toggle = (id: string) => setSelected((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
  const apply = () =>
    reallocate.mutate([...selected], {
      onSuccess: (outcome) => {
        const changed = outcome.results.filter((result) => result.changed).length;
        toast({ title: `${changed} of ${outcome.results.length} units re-allocated`, description: outcome.errors.length ? `${outcome.errors.length} refused: ${outcome.errors[0].message}` : undefined });
        setSelected(new Set());
      },
      onError: (error) => toast({ title: 'Could not re-allocate', description: friendlyError(error), variant: 'destructive' }),
    });
  if (isRouteMissing(reallocate.error)) return <p className="text-sm text-muted-foreground">Re-allocating many units at once is not available yet on this server.</p>;
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="realloc-search">Search units</Label>
        <Input id="realloc-search" value={q} onChange={(event) => setQ(event.target.value)} placeholder="Unit or name" />
      </div>
      <Table aria-label="Units">
        <TableHeader>
          <TableRow>
            <TableHead>Pick</TableHead>
            <TableHead>Unit</TableHead>
            <TableHead>Due</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(units.data?.data ?? []).map((unit) => (
            <TableRow key={unit.unit_id}>
              <TableCell>
                <input type="checkbox" aria-label={`Pick ${unit.unit_number}`} checked={selected.has(unit.unit_id)} onChange={() => toggle(unit.unit_id)} />
              </TableCell>
              <TableCell>{[unit.block, unit.unit_number].filter(Boolean).join('-')}</TableCell>
              <TableCell>{formatCurrency(unit.due)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Button type="button" disabled={!allowed || selected.size === 0 || reallocate.isPending} onClick={apply}>
        Re-allocate FIFO ({selected.size})
      </Button>
    </div>
  );
}

/** INC-61 — reverse a billing run: credit notes for all its invoices, refused while one is paid. */
export function ReverseRunCorrection({ allowed }: { allowed: boolean }): ReactNode {
  const runs = useBillingRuns(24);
  const reverse = useReverseBillingRun();
  const [reason, setReason] = useState('');
  const { addToast: toast } = useToast();
  const apply = (runId: string) =>
    reverse.mutate(
      { runId, reason },
      {
        onSuccess: (result) => toast({ title: `Run ${result.period_label ?? ''} reversed`, description: `${result.cancelled} invoices cancelled with ${result.credit_notes} credit notes.` }),
        onError: (error) => toast({ title: 'The run was not reversed', description: friendlyError(error), variant: 'destructive' }),
      },
    );
  if (isRouteMissing(reverse.error)) return <p className="text-sm text-muted-foreground">Reversing a billing run is not available yet on this server.</p>;
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="reverse-reason">Reason (printed on each credit note)</Label>
        <Input id="reverse-reason" value={reason} onChange={(event) => setReason(event.target.value)} maxLength={300} />
      </div>
      <Table aria-label="Billing runs">
        <TableHeader>
          <TableRow>
            <TableHead>Run date</TableHead>
            <TableHead>Period</TableHead>
            <TableHead>Invoices</TableHead>
            <TableHead>Reverse</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(runs.data ?? []).map((run) => (
            <TableRow key={run.id}>
              <TableCell>{formatDate(run.run_date)}</TableCell>
              <TableCell>{run.period_label ?? '—'}</TableCell>
              <TableCell>{run.invoices_created}</TableCell>
              <TableCell>
                <Button type="button" size="sm" variant="outline" disabled={!allowed || reason.trim().length < 3 || run.invoices_created === 0 || reverse.isPending} onClick={() => apply(run.id)}>
                  Reverse
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
