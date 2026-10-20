'use client';

import { type ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import type { UnidentifiedFilters } from '@/hooks/use-unidentified-collections';

/** Status (Open / Identified / All) and the date range beside the search box (INC-S22). */
export function UnidentifiedFilterControls({ value, onChange }: { value: UnidentifiedFilters; onChange: (patch: Partial<UnidentifiedFilters>) => void }): ReactNode {
  return (
    <div className="flex flex-wrap items-end gap-2">
      <Select aria-label="Status" value={value.status} onChange={(e) => onChange({ status: e.target.value as UnidentifiedFilters['status'] })}>
        <option value="open">Open</option>
        <option value="identified">Identified</option>
        <option value="all">All</option>
      </Select>
      <div className="flex items-center gap-1">
        <Label htmlFor="unidentified-from" className="text-xs">From</Label>
        <Input id="unidentified-from" type="date" className="w-40" value={value.from} onChange={(e) => onChange({ from: e.target.value })} />
      </div>
      <div className="flex items-center gap-1">
        <Label htmlFor="unidentified-to" className="text-xs">To</Label>
        <Input id="unidentified-to" type="date" className="w-40" value={value.to} onChange={(e) => onChange({ to: e.target.value })} />
      </div>
    </div>
  );
}
