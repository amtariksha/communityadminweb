'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { StatementFilters } from '@/hooks/use-unit-statement';

interface StatementFiltersProps {
  value: StatementFilters;
  /** The period the server used (its defaults when From / To were left empty). */
  shownFrom: string;
  shownTo: string;
  allowReversals: boolean;
  onSubmit: (next: Pick<StatementFilters, 'from' | 'to' | 'showReversals'>) => void;
}

/** From · To · Show Reversals · Submit above the statement (INC-S17). */
export function StatementFilterRow({ value, shownFrom, shownTo, allowReversals, onSubmit }: StatementFiltersProps): ReactNode {
  const [from, setFrom] = useState(value.from || shownFrom);
  const [to, setTo] = useState(value.to || shownTo);
  const [showReversals, setShowReversals] = useState(value.showReversals);

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    onSubmit({ from, to, showReversals });
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <Label htmlFor="statement-from">From date</Label>
        <Input id="statement-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="statement-to">To date</Label>
        <Input id="statement-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
      </div>
      {allowReversals && (
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input type="checkbox" checked={showReversals} onChange={(e) => setShowReversals(e.target.checked)} />
          Show Reversals
        </label>
      )}
      <Button type="submit" size="sm">
        Submit
      </Button>
    </form>
  );
}
