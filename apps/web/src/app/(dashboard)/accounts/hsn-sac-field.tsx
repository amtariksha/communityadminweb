'use client';

import { type ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { HSN_SAC_MESSAGE, HSN_SAC_PATTERN } from '@/lib/gst-lines';

/**
 * EXP-19 — HSN/SAC on an account (4, 6 or 8 digits, blank for none). Only
 * expense heads use it: lines on the head take it as their default.
 */
export function HsnSacField({ id, value, onChange }: { id: string; value: string; onChange: (value: string) => void }): ReactNode {
  const invalid = value.trim() !== '' && !HSN_SAC_PATTERN.test(value.trim());
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>HSN/SAC (expense heads)</Label>
      <Input id={id} inputMode="numeric" maxLength={8} placeholder="e.g., 998719" value={value} onChange={(e) => onChange(e.target.value)} />
      {invalid && <p className="text-xs text-destructive">{HSN_SAC_MESSAGE}</p>}
    </div>
  );
}
