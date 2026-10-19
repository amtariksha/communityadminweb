'use client';

import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { useEndRuleLine, type RuleLine } from '@/hooks/use-billing-rules';
import { friendlyError } from '@/lib/api-error';
import { dayBefore } from './rule-text';

/** "End this line from…" on Edit Line Item: the line bills nothing after the date. Nothing is deleted. */
export function EndLineControl({ line, onEnded }: { line: RuleLine; onEnded?: () => void }): ReactNode {
  const { addToast } = useToast();
  const end = useEndRuleLine();
  const [date, setDate] = useState(line.effective_to ?? '');
  const earliest = dayBefore(line.effective_from);

  async function submit(): Promise<void> {
    try {
      await end.mutateAsync({ id: line.id, effective_to: date });
      addToast({ title: `Line ends on ${date}`, variant: 'success' });
      onEnded?.();
    } catch (error) {
      addToast({ title: 'Could not end the line', description: friendlyError(error), variant: 'destructive' });
    }
  }

  return (
    <div className="flex flex-wrap items-end gap-2 border-t pt-4">
      <div className="space-y-1">
        <label htmlFor="rule-end-date" className="text-sm font-medium">
          End this line from…
        </label>
        <Input id="rule-end-date" type="date" min={earliest} value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <Button type="button" variant="outline" disabled={!date || date < earliest || end.isPending} onClick={() => void submit()}>
        End line
      </Button>
      <p className="w-full text-xs text-muted-foreground">The last day the line bills. Issued invoices are not changed.</p>
    </div>
  );
}
