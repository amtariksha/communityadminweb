'use client';

import { type ReactNode } from 'react';
import { Input } from '@/components/ui/input';

export interface NumberRange {
  from: string;
  to: string;
}

export const EMPTY_RANGE: NumberRange = { from: '', to: '' };

const DIGITS = /^\d*$/;

/** `from_number` / `to_number` for a list (INC-44); blanks and non-digits are left out. */
export function numberRangeParams(range: NumberRange): { from_number?: string; to_number?: string } {
  const params: { from_number?: string; to_number?: string } = {};
  const from = range.from.trim();
  const to = range.to.trim();
  if (from && DIGITS.test(from)) params.from_number = from;
  if (to && DIGITS.test(to)) params.to_number = to;
  return params;
}

/**
 * "No. from … to …" on the standard /invoices and /receipts lists (INC-44):
 * the numeric part of the document number, e.g. 105 for RCT-0105.
 */
export function NumberRangeFilter({ label, value, onChange }: {
  label: string;
  value: NumberRange;
  onChange: (next: NumberRange) => void;
}): ReactNode {
  const set = (end: keyof NumberRange, text: string): void => {
    if (DIGITS.test(text)) onChange({ ...value, [end]: text });
  };
  return (
    <span className="inline-flex items-center gap-1">
      <Input
        inputMode="numeric"
        aria-label={`${label} from`}
        placeholder={`${label} from`}
        className="w-28"
        value={value.from}
        onChange={(event) => set('from', event.target.value)}
      />
      <span className="text-xs text-muted-foreground">to</span>
      <Input
        inputMode="numeric"
        aria-label={`${label} to`}
        placeholder="to"
        className="w-24"
        value={value.to}
        onChange={(event) => set('to', event.target.value)}
      />
    </span>
  );
}
