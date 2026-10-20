'use client';

import { useSearchParams } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';

/** DASH-11 — the directory's "App" filter; the dashboard's Never Logged In link opens it set. */
export type AppStatusFilter = '' | 'never_logged_in';

export const NEVER_LOGGED_IN_HREF = '/units/directory?app_status=never_logged_in';

/** The filter, starting from `?app_status=` in the link. */
export function useAppStatusFilter(): [AppStatusFilter, (value: AppStatusFilter) => void] {
  const params = useSearchParams();
  return useState<AppStatusFilter>(params?.get('app_status') === 'never_logged_in' ? 'never_logged_in' : '');
}

export function AppStatusSelect({ value, onChange }: { value: AppStatusFilter; onChange: (value: AppStatusFilter) => void }): ReactNode {
  return (
    <div className="space-y-2">
      <Label htmlFor="dir-app">App</Label>
      <Select id="dir-app" value={value} onChange={(e) => onChange(e.target.value === 'never_logged_in' ? 'never_logged_in' : '')}>
        <option value="">Everyone</option>
        <option value="never_logged_in">Never logged in</option>
      </Select>
    </div>
  );
}
