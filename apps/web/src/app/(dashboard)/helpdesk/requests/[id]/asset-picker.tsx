'use client';

import { useState, type ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { useAssets } from '@/hooks';
import type { LinkedAsset } from '@/hooks/use-tickets';
import { linkedAssetLine } from './linked-asset';

interface AssetPickerProps {
  value: string;
  /** The linked asset's name as stored on the request. */
  currentName: string | null | undefined;
  /** The linked asset as the request read returns it, for roles that cannot search the register. */
  current?: LinkedAsset | null;
  disabled: boolean;
  onChange: (assetId: string) => void;
}

const RESULTS = 20;

/**
 * Linked asset (HELP-19): search the society's assets and pick one; blank
 * unlinks. A role that cannot read the asset register sees the linked
 * asset as the request read returns it (code, name, place, status).
 */
export function AssetPicker({ value, currentName, current, disabled, onChange }: AssetPickerProps): ReactNode {
  const [search, setSearch] = useState('');
  const assets = useAssets({ search: search.trim() || undefined, limit: RESULTS });
  const found = assets.data?.data ?? [];
  const keepsCurrent = value !== '' && !found.some((asset) => asset.id === value);

  if (assets.isError) {
    return (
      <div className="space-y-1 text-sm">
        <span className="font-medium">Linked asset</span>
        <p className="text-muted-foreground">{current ? linkedAssetLine(current) : currentName ?? '—'}</p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <Label htmlFor="record-asset">Linked asset</Label>
      <Input
        aria-label="Search assets"
        placeholder="Search assets"
        value={search}
        disabled={disabled}
        onChange={(event) => setSearch(event.target.value)}
      />
      <Select id="record-asset" value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
        <option value="">No asset</option>
        {keepsCurrent && <option value={value}>{currentName ?? 'Linked asset'}</option>}
        {found.map((asset) => (
          <option key={asset.id} value={asset.id}>
            {asset.name}
          </option>
        ))}
      </Select>
    </div>
  );
}
