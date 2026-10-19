'use client';

import { type ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { todayIST } from '@/lib/date';
import type { ResidentAudience } from '../files/file-roots';

export interface UnitChoiceOption {
  id: string;
  unit_number: string;
  block?: string | null;
}

export function TextFields(props: {
  title: string;
  description: string;
  onTitle: (value: string) => void;
  onDescription: (value: string) => void;
}): ReactNode {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="file-title">Title</Label>
        <Input id="file-title" maxLength={255} value={props.title} onChange={(e) => props.onTitle(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="file-description">Description</Label>
        <Textarea
          id="file-description"
          maxLength={2000}
          value={props.description}
          onChange={(e) => props.onDescription(e.target.value)}
        />
      </div>
    </>
  );
}

export function AudienceSelect({ value, onChange }: { value: ResidentAudience; onChange: (value: ResidentAudience) => void }): ReactNode {
  return (
    <div className="space-y-2">
      <Label htmlFor="file-audience">Audience</Label>
      <Select id="file-audience" value={value} onChange={(e) => onChange(e.target.value as ResidentAudience)}>
        <option value="all">All residents</option>
        <option value="owner">Owners only</option>
        <option value="tenant_resident">Tenants only</option>
      </Select>
    </div>
  );
}

export function UnitSelect(props: { units: readonly UnitChoiceOption[]; value: string; onChange: (value: string) => void }): ReactNode {
  return (
    <div className="space-y-2">
      <Label htmlFor="file-unit">Unit</Label>
      <Select id="file-unit" value={props.value} onChange={(e) => props.onChange(e.target.value)}>
        <option value="">Select a unit</option>
        {props.units.map((unit) => (
          <option key={unit.id} value={unit.id}>
            {unit.block ? `${unit.block} · ` : ''}
            {unit.unit_number}
          </option>
        ))}
      </Select>
    </div>
  );
}

export function ExpiryField({ value, onChange }: { value: string; onChange: (value: string) => void }): ReactNode {
  return (
    <div className="space-y-2">
      <Label htmlFor="file-expiry">Expiry date</Label>
      <Input id="file-expiry" type="date" min={todayIST()} value={value} onChange={(e) => onChange(e.target.value)} />
      <p className="text-xs text-muted-foreground">Optional. The file shows under Expiring Soon from 30 days before.</p>
    </div>
  );
}

export const FILE_ACCEPT =
  'application/pdf,image/jpeg,image/png,image/webp,text/csv,text/plain,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export function FilePicker(props: { label: string; file: File | null; onPick: (file: File | null) => void }): ReactNode {
  return (
    <div className="space-y-2">
      <Label htmlFor="file-input">{props.label}</Label>
      <Input id="file-input" type="file" accept={FILE_ACCEPT} onChange={(e) => props.onPick(e.target.files?.[0] ?? null)} />
      <p className="text-xs text-muted-foreground">PDF, images, CSV or spreadsheets, up to 25 MB.</p>
    </div>
  );
}
