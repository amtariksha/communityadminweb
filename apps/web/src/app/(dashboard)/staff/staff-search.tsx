'use client';

import { type ReactNode } from 'react';
import type { StaffSearchKey } from '@/hooks/use-staff';

/**
 * "Search by" for the staff lists (STAFF-21): the one search box looks in the
 * chosen field, or all of them for Any. Badge finds one badge exactly. Unit
 * comes with the register that holds household help (STAFF-42).
 */
export const STAFF_SEARCH_KEYS: ReadonlyArray<{ value: StaffSearchKey; label: string }> = [
  { value: 'badge', label: 'Badge' },
  { value: 'name', label: 'Name' },
  { value: 'category', label: 'Category' },
  { value: 'phone', label: 'Phone' },
  { value: 'any', label: 'Any' },
];

export function StaffSearchBy({ value, onChange }: { value: StaffSearchKey; onChange: (key: StaffSearchKey) => void }): ReactNode {
  return (
    <fieldset className="flex flex-wrap items-center gap-2 text-sm">
      <legend className="sr-only">Search by</legend>
      <span className="text-muted-foreground">Search by</span>
      {STAFF_SEARCH_KEYS.map((key) => (
        <label key={key.value} className="flex items-center gap-1">
          <input type="radio" name="staff-search-by" value={key.value} checked={value === key.value} onChange={() => onChange(key.value)} />
          {key.label}
        </label>
      ))}
    </fieldset>
  );
}
