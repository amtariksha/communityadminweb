'use client';

import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLedgerAccounts } from '@/hooks/use-ledger';
import { useUnitBillingCategories } from '@/hooks/use-unit-billing-categories';
import type { DefaulterFilters } from '@/hooks/use-defaulters';

type Criteria = Omit<DefaulterFilters, 'view' | 'q'>;

function Checklist({ legend, options, value, onChange }: {
  legend: string;
  options: ReadonlyArray<{ id: string; label: string }>;
  value: string[];
  onChange: (next: string[]) => void;
}): ReactNode {
  return (
    <fieldset className="space-y-1">
      <legend className="text-sm font-medium">{legend}</legend>
      <div className="max-h-32 space-y-1 overflow-y-auto rounded-md border p-2">
        {options.length === 0 && <p className="text-xs text-muted-foreground">None yet</p>}
        {options.map((option) => (
          <label key={option.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={value.includes(option.id)}
              onChange={(e) => onChange(e.target.checked ? [...value, option.id] : value.filter((id) => id !== option.id))}
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** "Filter Criteria" of the Defaulters page (INC-S29); Apply hands the criteria up. */
export function DefaultersFilters({ onApply }: { onApply: (criteria: Criteria) => void }): ReactNode {
  const types = useUnitBillingCategories();
  const accounts = useLedgerAccounts({ account_type: 'income', limit: 100 });
  const [criteria, setCriteria] = useState<Criteria>({ category_ids: [], account_ids: [] });
  const set = <K extends keyof Criteria>(key: K, value: Criteria[K]): void => setCriteria((prev) => ({ ...prev, [key]: value }));
  const badRange = Boolean(criteria.min_due && criteria.max_due && Number(criteria.min_due) > Number(criteria.max_due));

  return (
    <form
      aria-label="Filter Criteria"
      className="grid grid-cols-1 gap-4 rounded-md border p-4 md:grid-cols-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!badRange) onApply(criteria);
      }}
    >
      <div className="space-y-1">
        <Label htmlFor="def-posted-before">Invoices Posted Before</Label>
        <Input id="def-posted-before" type="date" value={criteria.posted_before ?? ''} onChange={(e) => set('posted_before', e.target.value || undefined)} />
      </div>
      <div className="space-y-1">
        <span className="text-sm font-medium">Amount Between</span>
        <div className="flex items-center gap-2">
          <Input aria-label="Amount from" type="number" min={0} value={criteria.min_due ?? ''} onChange={(e) => set('min_due', e.target.value || undefined)} />
          <span className="text-xs text-muted-foreground">and</span>
          <Input aria-label="Amount to" type="number" min={0} value={criteria.max_due ?? ''} onChange={(e) => set('max_due', e.target.value || undefined)} />
        </div>
        {badRange && <p className="text-xs text-destructive">The first amount must not be above the second.</p>}
      </div>
      <Checklist
        legend="Unit types"
        options={(types.data?.data ?? []).map((t) => ({ id: t.id, label: t.name }))}
        value={criteria.category_ids ?? []}
        onChange={(next) => set('category_ids', next)}
      />
      <Checklist
        legend="Income Accounts"
        options={(accounts.data?.data ?? []).map((a) => ({ id: a.id, label: a.name }))}
        value={criteria.account_ids ?? []}
        onChange={(next) => set('account_ids', next)}
      />
      <div className="md:col-span-4">
        <Button type="submit">Apply filters</Button>
      </div>
    </form>
  );
}
