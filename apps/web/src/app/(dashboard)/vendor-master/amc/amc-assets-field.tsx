'use client';

import { useState, type ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAssetRegister } from '@/hooks/use-asset-register';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import type { AmcFormValues } from './amc-form-values';

type SetAmc = (patch: Partial<AmcFormValues>) => void;

// The most GET /assets returns in one page.
const SHOWN = 100;

/**
 * Assets of the chosen category, ticked to be covered (VEND-S8). One page
 * holds 100; a bigger category is searched on the server (name, serial
 * number, location, asset code), and ticks made under another search stay.
 */
export function AmcAssetsField({ values, set }: { values: AmcFormValues; set: SetAmc }): ReactNode {
  const [draft, setDraft] = useState('');
  const search = useDebouncedValue(draft.trim(), 300);
  const assets = useAssetRegister({ category: values.categoryId || undefined, search: search || undefined, page: 1, limit: SHOWN });
  const rows = values.categoryId ? (assets.data?.data ?? []) : [];
  const total = values.categoryId ? (assets.data?.total ?? rows.length) : 0;
  const toggle = (id: string): void =>
    set({ assetIds: values.assetIds.includes(id) ? values.assetIds.filter((other) => other !== id) : [...values.assetIds, id] });
  const searchable = Boolean(values.categoryId) && (search !== '' || total > rows.length);
  return (
    <div className="col-span-2 space-y-2">
      <Label>Assets</Label>
      {!values.categoryId && <p className="text-xs text-muted-foreground">Choose an asset category to pick its assets.</p>}
      {searchable && (
        <Input aria-label="Search assets" placeholder="Search by name, serial no., location or code" value={draft} onChange={(e) => setDraft(e.target.value)} />
      )}
      {values.categoryId && rows.length === 0 && (
        <p className="text-xs text-muted-foreground">{search ? 'No assets match the search.' : 'No assets in this category.'}</p>
      )}
      <ul aria-label="Assets covered" className="max-h-40 space-y-1 overflow-y-auto">
        {rows.map((asset) => (
          <li key={asset.id}>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={values.assetIds.includes(asset.id)} onChange={() => toggle(asset.id)} />
              {asset.name}
              {asset.location ? <span className="text-muted-foreground"> · {asset.location}</span> : null}
            </label>
          </li>
        ))}
      </ul>
      {total > rows.length && (
        <p className="text-xs text-muted-foreground">Showing {rows.length} of {total}. Search to find the others.</p>
      )}
      {values.assetIds.length > 0 && <p className="text-xs text-muted-foreground">{values.assetIds.length} asset(s) covered.</p>}
    </div>
  );
}
