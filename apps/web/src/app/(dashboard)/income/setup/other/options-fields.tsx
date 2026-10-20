'use client';

import { type ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { EntityField, OptionsErrors, OptionsForm } from './document-options';

interface OptionsFieldsProps {
  form: OptionsForm;
  errors: OptionsErrors;
  change: (patch: Partial<OptionsForm>) => void;
  disabled: boolean;
}

const NAMES: ReadonlyArray<[EntityField, string]> = [
  ['maintenance', 'Name for maintenance documents'],
  ['utility', 'Name for utility documents'],
  ['non_member', 'Name for non-member documents'],
];

const TICKS: ReadonlyArray<['publish_dues' | 'show_interest_breakup' | 'logo_on_receipt', string]> = [
  ['publish_dues', 'Publish dues to residents'],
  ['show_interest_breakup', 'Show Interest Breakup in the Invoice'],
  ['logo_on_receipt', 'Logo on receipt'],
];

/** Entity names, the three ticks and the payment instructions of Setup › Other (INC-S9). */
export function OptionsFields({ form, errors, change, disabled }: OptionsFieldsProps): ReactNode {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {NAMES.map(([field, label]) => (
          <div key={field} className="space-y-1">
            <Label htmlFor={`entity-${field}`}>{label}</Label>
            <Input
              id={`entity-${field}`}
              maxLength={40}
              value={form[field]}
              disabled={disabled}
              onChange={(e) => change({ [field]: e.target.value })}
            />
            {errors[field] && <p className="text-xs text-destructive">{errors[field]}</p>}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-6">
        {TICKS.map(([field, label]) => (
          <label key={field} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="rounded border-input"
              checked={form[field]}
              disabled={disabled}
              onChange={(e) => change({ [field]: e.target.checked })}
            />
            {label}
          </label>
        ))}
      </div>
      <div className="space-y-1">
        <Label htmlFor="payment-instructions">Payment Instructions</Label>
        <Textarea
          id="payment-instructions"
          rows={6}
          value={form.instructions}
          disabled={disabled}
          onChange={(e) => change({ instructions: e.target.value })}
        />
        {errors.instructions ? (
          <p className="text-xs text-destructive">{errors.instructions}</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Printed on invoices in place of the standard payment terms. One paragraph per line; &lt;b&gt;, &lt;i&gt;,
            &lt;u&gt; and lists may be typed.
          </p>
        )}
      </div>
    </div>
  );
}
