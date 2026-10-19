'use client';

import { type ReactNode } from 'react';
import type { FinancialYear } from '@communityos/shared';
import { Label } from '@/components/ui/label';

// Phase C round-trip: the voucher type Tally gets on export (dialog only;
// the classic page always posts a Journal).
export const VOUCHER_TYPES = [
  { value: 'Journal', label: 'Journal — free-form bookkeeping' },
  { value: 'Contra', label: 'Contra — bank ↔ bank / cash ↔ bank' },
  { value: 'Payment', label: 'Payment — outgoing cash' },
  { value: 'Receipt', label: 'Receipt — incoming cash' },
  { value: 'Credit Note', label: 'Credit Note — sales reversal' },
  { value: 'Debit Note', label: 'Debit Note — vendor return' },
  { value: 'Sales', label: 'Sales' },
  { value: 'Purchase', label: 'Purchase' },
] as const;

const SELECT_CLASS = 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background';

interface DialogExtrasProps {
  years: readonly FinancialYear[];
  yearId: string;
  onYear: (id: string) => void;
  voucherType: string;
  onVoucherType: (type: string) => void;
}

/** The standard dialog's financial year and voucher type selects. */
export function DialogExtras({ years, yearId, onYear, voucherType, onVoucherType }: DialogExtrasProps): ReactNode {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="je-fy">Financial year</Label>
        <select id="je-fy" required value={yearId} onChange={(e) => onYear(e.target.value)} className={SELECT_CLASS}>
          <option value="">Pick FY</option>
          {years.map((year) => (
            <option key={year.id} value={year.id}>
              {year.label}
              {year.is_current ? ' (current)' : ''}
              {year.is_frozen ? ' — frozen' : ''}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="je-voucher-type">
          Voucher type <span className="text-xs font-normal text-muted-foreground">(controls how Tally classifies this entry on export)</span>
        </Label>
        <select id="je-voucher-type" value={voucherType} onChange={(e) => onVoucherType(e.target.value)} className={SELECT_CLASS}>
          {VOUCHER_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}
