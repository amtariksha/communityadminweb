'use client';

import { type ReactNode } from 'react';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { withCount } from './table-text';

/** One option with the number of rows behind it (list `counts` / facets). */
export interface CountedOption {
  value: string;
  label: string;
  count?: number;
}

interface CountedSelectProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** First option, value ''. */
  allLabel: string;
  allCount?: number;
  options: readonly CountedOption[];
}

/** A list filter whose options read "name (n)" (SB-04 counts convention). */
export function CountedSelect({ id, label, value, onChange, allLabel, allCount, options }: CountedSelectProps): ReactNode {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <Select id={id} value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">{withCount(allLabel, allCount)}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {withCount(option.label, option.count)}
          </option>
        ))}
      </Select>
    </div>
  );
}
