'use client';

import { type ReactNode } from 'react';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { useAdminLayout } from '@/lib/layout-context';
import { statusChoices, ticketStatusLabel } from '@/lib/ticket-status';

interface StatusPickerProps {
  id: string;
  current: string;
  disabled?: boolean;
  onChange: (status: string) => void;
}

/**
 * Every status the request may move to, in the layout's words (HELP-14):
 * On Hold and Awaiting Resident Response included; a closed request
 * offers only Reopened.
 */
export function StatusPicker({ id, current, disabled, onChange }: StatusPickerProps): ReactNode {
  const layout = useAdminLayout();
  return (
    <div className="flex items-center gap-2">
      <Label htmlFor={id}>Change status</Label>
      <Select
        id={id}
        value={current}
        disabled={disabled}
        onChange={(event) => {
          if (event.target.value !== current) onChange(event.target.value);
        }}
      >
        {statusChoices(current).map((status) => (
          <option key={status} value={status}>
            {ticketStatusLabel(status, layout)}
          </option>
        ))}
      </Select>
    </div>
  );
}
