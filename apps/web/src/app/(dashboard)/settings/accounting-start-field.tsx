'use client';

import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toast';
import { useLedgerSettings, useSaveAccountingStartDate } from '@/hooks/use-ledger-settings';
import { friendlyError } from '@/lib/api-error';
import { formatDate } from '@/lib/utils';

/**
 * Accounting start date (GL-19) on Settings › Financial Years: the day the
 * books begin. No entry may be dated before it; an opening balance without
 * a date of its own is dated with it. The community admin changes it.
 */
export function AccountingStartField({ canChange }: { canChange: boolean }): ReactNode {
  const { addToast } = useToast();
  const settings = useLedgerSettings();
  const save = useSaveAccountingStartDate();
  const [draft, setDraft] = useState<string | null>(null);

  if (settings.isLoading) return null;
  if (settings.data === null) {
    return <p className="text-sm text-muted-foreground">Accounting start date: not available yet on this server.</p>;
  }
  const stored = settings.data?.accounting_start_date ?? null;
  const value = draft ?? stored ?? '';

  function submit(): void {
    save.mutate(value || null, {
      onSuccess: () => {
        setDraft(null);
        addToast({ title: value ? `Accounting start date set to ${formatDate(value)}` : 'Accounting start date cleared', variant: 'success' });
      },
      onError: (error) => addToast({ title: 'Could not save the start date', description: friendlyError(error), variant: 'destructive' }),
    });
  }

  return (
    <div className="space-y-2 rounded-md border p-4">
      <Label htmlFor="accounting-start-date">Accounting start date</Label>
      <p className="text-xs text-muted-foreground">
        No entry can be dated before it. Not set: the books start with the first financial year
        {settings.data?.earliest_financial_year_start ? ` (${formatDate(settings.data.earliest_financial_year_start)})` : ''}.
      </p>
      {canChange ? (
        <div className="flex flex-wrap items-center gap-2">
          <Input id="accounting-start-date" type="date" className="w-48" value={value} onChange={(event) => setDraft(event.target.value)} />
          <Button type="button" size="sm" disabled={save.isPending || value === (stored ?? '')} onClick={submit}>
            {save.isPending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      ) : (
        <p id="accounting-start-date" className="text-sm">{stored ? formatDate(stored) : 'Not set'}</p>
      )}
    </div>
  );
}
