'use client';

import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toast';
import { useWaiveInterestBatch } from '@/hooks/use-income-corrections';
import { useBulkUpdateDueDates } from '@/hooks/use-invoices';
import { friendlyError } from '@/lib/api-error';
import { isRouteMissing } from '@/lib/not-deployed';
import { InvoicePicker } from './invoice-picker';

/** INC-61 — new due date for chosen open invoices (PATCH /invoices/due-dates). */
export function DueDateCorrection({ allowed }: { allowed: boolean }): ReactNode {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dueDate, setDueDate] = useState('');
  const update = useBulkUpdateDueDates();
  const { addToast: toast } = useToast();
  const apply = () =>
    update.mutate(
      { invoice_ids: [...selected], due_date: dueDate },
      {
        onSuccess: () => {
          toast({ title: `Due date changed on ${selected.size} invoice${selected.size === 1 ? '' : 's'}` });
          setSelected(new Set());
        },
        onError: (error) => toast({ title: 'Could not change the due date', description: friendlyError(error), variant: 'destructive' }),
      },
    );
  return (
    <div className="space-y-3">
      <InvoicePicker selected={selected} onChange={setSelected} />
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="new-due-date">New due date</Label>
          <Input id="new-due-date" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
        </div>
        <Button type="button" disabled={!allowed || selected.size === 0 || !dueDate || update.isPending} onClick={apply}>
          Change due date ({selected.size})
        </Button>
      </div>
    </div>
  );
}

/** INC-61 — waive the interest of chosen invoices (one waiver each, INC-08). */
export function WaiveInterestCorrection({ allowed }: { allowed: boolean }): ReactNode {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const waive = useWaiveInterestBatch();
  const { addToast: toast } = useToast();
  const apply = () =>
    waive.mutate([...selected], {
      onSuccess: (outcome) => {
        toast({ title: `Interest waived on ${outcome.done.length} invoice${outcome.done.length === 1 ? '' : 's'}`, description: outcome.errors.length ? `${outcome.errors.length} refused: ${outcome.errors[0].message}` : undefined });
        setSelected(new Set());
      },
      onError: (error) => toast({ title: 'Could not waive the interest', description: friendlyError(error), variant: 'destructive' }),
    });
  if (isRouteMissing(waive.error)) return <p className="text-sm text-muted-foreground">Waiving interest in bulk is not available yet on this server.</p>;
  return (
    <div className="space-y-3">
      <InvoicePicker selected={selected} onChange={setSelected} pickable={(invoice) => invoice.lpi_amount > 0} />
      <Button type="button" disabled={!allowed || selected.size === 0 || waive.isPending} onClick={apply}>
        Waive interest ({selected.size})
      </Button>
    </div>
  );
}
