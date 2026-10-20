'use client';

import { type ReactNode } from 'react';
import type { RegisterSearchKey } from '@/hooks/use-staff-register';

/**
 * "Search by" for the staff lists (STAFF-21): the one search box looks in the
 * chosen field, or all of them for Any. Badge finds one badge exactly. Unit
 * finds household help by the flats they serve (STAFF-42).
 */
export const STAFF_SEARCH_KEYS: ReadonlyArray<{ value: RegisterSearchKey; label: string }> = [
  { value: 'badge', label: 'Badge' },
  { value: 'unit', label: 'Unit' },
  { value: 'name', label: 'Name' },
  { value: 'category', label: 'Category' },
  { value: 'phone', label: 'Phone' },
  { value: 'any', label: 'Any' },
];

export function StaffSearchBy({ value, onChange }: { value: RegisterSearchKey; onChange: (key: RegisterSearchKey) => void }): ReactNode {
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
