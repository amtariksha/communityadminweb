'use client';

import { type ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { AmcFrequency } from '@/hooks/use-amc-contracts';
import { AMC_FREQUENCY_OPTIONS, type AmcFormValues } from './amc-form-values';
import type { SetAmc } from './amc-basic-fields';

interface ScheduleProps {
  kind: 'payment' | 'service';
  values: AmcFormValues;
  set: SetAmc;
}

const KEYS = {
  payment: { frequency: 'paymentFrequency', start: 'paymentStart', title: 'Payment Schedule (Optional)', startLabel: 'Starting date for Payment Installments' },
  service: { frequency: 'serviceFrequency', start: 'serviceStart', title: 'Service Schedule (Optional)', startLabel: 'Starting date for Service Installments' },
} as const;

/** Payment Schedule / Service Schedule (VEND-S8): a frequency and the first date, or none. */
export function AmcScheduleFields({ kind, values, set }: ScheduleProps): ReactNode {
  const keys = KEYS[kind];
  const frequency = values[keys.frequency];
  const choose = (value: '' | AmcFrequency): void => set({ [keys.frequency]: value } as Partial<AmcFormValues>);
  return (
    <fieldset className="space-y-2">
      <legend className="mb-1 text-sm font-semibold">{keys.title}</legend>
      <div role="radiogroup" aria-label={`${kind} frequency`} className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-1">
          <input type="radio" name={`${kind}-frequency`} checked={frequency === ''} onChange={() => choose('')} /> None
        </label>
        {AMC_FREQUENCY_OPTIONS.map((option) => (
          <label key={option.value} className="flex items-center gap-1">
            <input type="radio" name={`${kind}-frequency`} checked={frequency === option.value} onChange={() => choose(option.value)} /> {option.label}
          </label>
        ))}
      </div>
      {frequency && (
        <div className="max-w-xs space-y-2">
          <Label htmlFor={`amc-${kind}-start`}>{keys.startLabel} *</Label>
          <Input
            id={`amc-${kind}-start`}
            type="date"
            value={values[keys.start]}
            onChange={(e) => set({ [keys.start]: e.target.value } as Partial<AmcFormValues>)}
          />
        </div>
      )}
    </fieldset>
  );
}
