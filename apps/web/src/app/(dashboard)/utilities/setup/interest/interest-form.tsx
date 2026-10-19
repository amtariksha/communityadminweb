'use client';

import { type ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { InterestErrors, InterestForm } from '@/app/(dashboard)/settings/interest-settings';

interface UtilityInterestFieldsProps {
  form: InterestForm;
  errors: InterestErrors;
  disabled: boolean;
  onChange: <K extends keyof InterestForm>(key: K, value: InterestForm[K]) => void;
}

const BASES = [
  ['due_date', 'Due Date'],
  ['invoice_date', 'Invoice Date'],
] as const;

/** The four inputs of Utility Tracker › Setup › Simple Interest (UTIL-S3). */
export function UtilityInterestFields({ form, errors, disabled, onChange }: UtilityInterestFieldsProps): ReactNode {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="utility-interest-rate">Simple Interest ( % pa )</Label>
          <Input
            id="utility-interest-rate"
            type="number"
            inputMode="decimal"
            min={0}
            max={36}
            step="0.01"
            disabled={disabled}
            value={form.rate_pa}
            onChange={(e) => onChange('rate_pa', e.target.value)}
          />
          {errors.rate_pa && <p className="text-xs text-destructive">{errors.rate_pa}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="utility-interest-due-days">Due Date ( in days )</Label>
          <Input
            id="utility-interest-due-days"
            type="number"
            inputMode="numeric"
            min={0}
            max={365}
            step="1"
            disabled={disabled}
            value={form.due_days}
            onChange={(e) => onChange('due_days', e.target.value)}
          />
          {errors.due_days && <p className="text-xs text-destructive">{errors.due_days}</p>}
        </div>
      </div>
      <div className="max-w-xs space-y-2">
        <Label htmlFor="utility-interest-start">Interest Start Date (optional)</Label>
        <Input
          id="utility-interest-start"
          type="date"
          disabled={disabled}
          value={form.start_date}
          onChange={(e) => onChange('start_date', e.target.value)}
        />
        <p className="text-xs text-muted-foreground">No interest is charged for days before this date.</p>
      </div>
      <fieldset className="space-y-2" disabled={disabled}>
        <legend className="text-sm font-medium">Interest counted from</legend>
        <div className="flex flex-wrap gap-6">
          {BASES.map(([value, label]) => (
            <label key={value} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="utility-interest-basis"
                checked={form.basis === value}
                onChange={() => onChange('basis', value)}
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
