'use client';

import { useState, type ReactNode } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { api } from '@/lib/api';
import { ApiError, friendlyError } from '@/lib/api-error';

interface RunNowResult {
  run_id: string;
  status: string;
  invoices_created: number;
  invoices_posted: number;
  units_skipped: number;
}

/** "Run now" (INC-19): bill a missed or back-dated period start from rule lines. */
export function RunNowControl(): ReactNode {
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const [month, setMonth] = useState('');
  const [confirming, setConfirming] = useState(false);
  const run = useMutation({
    mutationFn: (invoiceDate: string) =>
      api.post<{ data: RunNowResult }>('/billing-runs', { invoice_date: invoiceDate }).then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invoices'] }),
  });

  async function submit(): Promise<void> {
    setConfirming(false);
    try {
      const result = await run.mutateAsync(`${month}-01`);
      addToast({
        title: `${result.invoices_created} invoice(s) raised`,
        description: `${result.units_skipped} unit(s) already billed for the period. See Billing runs below.`,
        variant: 'success',
      });
    } catch (error) {
      const missing = error instanceof ApiError && error.status === 404;
      addToast({
        title: 'Could not run billing',
        description: missing ? 'Run now is not available yet on this server.' : friendlyError(error),
        variant: 'destructive',
      });
    }
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="space-y-1">
        <label htmlFor="run-now-month" className="text-sm font-medium">
          Bill a period now
        </label>
        <Input id="run-now-month" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
      </div>
      {confirming ? (
        <>
          <Button type="button" onClick={() => void submit()} disabled={run.isPending}>
            Yes, raise the invoices
          </Button>
          <Button type="button" variant="outline" onClick={() => setConfirming(false)}>
            Cancel
          </Button>
        </>
      ) : (
        <Button type="button" variant="outline" disabled={!/^\d{4}-\d{2}$/.test(month)} onClick={() => setConfirming(true)}>
          <Play className="mr-2 h-4 w-4" />
          Run now
        </Button>
      )}
      <p className="w-full text-xs text-muted-foreground">
        For a missed or back-dated period start. A unit already billed for the period is skipped.
      </p>
    </div>
  );
}
