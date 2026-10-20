'use client';

import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAssets, type Asset } from '@/hooks/use-assets';
import { useDebouncedValue } from '@/hooks/use-debounced-value';

export type AssetChoice = Pick<Asset, 'id' | 'name'> & Partial<Pick<Asset, 'location'>>;

interface AssetSearchSelectProps {
  id: string;
  value: AssetChoice | null;
  onChange: (asset: AssetChoice | null) => void;
  /** Assets not offered, e.g. the asset itself and parts when picking a parent (ASSET-18). */
  exclude?: (asset: Asset) => boolean;
  /** Text of the button that clears the choice. */
  clearLabel?: string;
}

const SHOWN = 20;

/**
 * Asset picker that searches the server (name, serial number, location,
 * asset code) instead of loading one page of assets, so every asset of
 * the society can be picked (AMC and service log forms).
 */
export function AssetSearchSelect({ id, value, onChange, exclude, clearLabel = 'Change' }: AssetSearchSelectProps): ReactNode {
  const [draft, setDraft] = useState('');
  const search = useDebouncedValue(draft.trim(), 300);
  const query = useAssets({ page: 1, limit: SHOWN, search: search || undefined });
  const hits = value ? [] : (query.data?.data ?? []).filter((asset) => !exclude?.(asset));

  if (value) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
        <span>
          {value.name}
          {value.location ? ` · ${value.location}` : ''}
        </span>
        <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
          {clearLabel}
        </Button>
      </div>
    );
  }
  return (
    <div className="space-y-1">
      <Input
        id={id}
        type="search"
        autoComplete="off"
        placeholder="Search by name, serial no., location or code"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
      />
      <ul aria-label="Matching assets" className="max-h-48 overflow-y-auto rounded-md border">
        {hits.map((asset) => (
          <li key={asset.id}>
            <button
              type="button"
              className="w-full px-3 py-1.5 text-left text-sm hover:bg-muted"
              onClick={() => onChange({ id: asset.id, name: asset.name, location: asset.location })}
            >
              {asset.name}
              {asset.location ? <span className="text-muted-foreground"> · {asset.location}</span> : null}
            </button>
          </li>
        ))}
        {!query.isLoading && hits.length === 0 && (
          <li className="px-3 py-1.5 text-sm text-muted-foreground">{search ? 'No asset matches.' : 'No assets yet.'}</li>
        )}
      </ul>
    </div>
  );
}
