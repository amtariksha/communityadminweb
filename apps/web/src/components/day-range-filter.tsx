'use client';

import { type ReactNode } from 'react';
import { Input } from '@/components/ui/input';

/** A From / To pair of India days (`YYYY-MM-DD`; '' = open). */
export interface DayRange {
  from: string;
  to: string;
}

/** From / To day pickers; an end before the start moves the start with it. */
export function DayRangeFilter({ value, onChange }: { value: DayRange; onChange: (range: DayRange) => void }): ReactNode {
  return (
    <div className="flex items-center gap-1 text-sm">
      <label className="flex items-center gap-1">
        From
        <Input
          type="date"
          aria-label="From date"
          className="w-36"
          value={value.from}
          onChange={(event) => onChange({ from: event.target.value, to: value.to && event.target.value > value.to ? event.target.value : value.to })}
        />
      </label>
      <label className="flex items-center gap-1">
        To
        <Input
          type="date"
          aria-label="To date"
          className="w-36"
          value={value.to}
          onChange={(event) => onChange({ from: value.from && event.target.value < value.from ? event.target.value : value.from, to: event.target.value })}
        />
      </label>
    </div>
  );
}
