'use client';

import { type ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import type { AssetFormValues } from './asset-form-fields';

type Set = (patch: Partial<AssetFormValues>) => void;

function NumberField(props: { id: string; label: string; value: string; onChange: (value: string) => void; step?: string }): ReactNode {
  return (
    <div className="space-y-2">
      <Label htmlFor={props.id}>{props.label}</Label>
      <Input id={props.id} type="number" min="0" step={props.step ?? 'any'} value={props.value} onChange={(e) => props.onChange(e.target.value)} />
    </div>
  );
}

/**
 * ASSET-19 — the asset's own depreciation inputs. Each blank one is the
 * category's (Setup › Setup Asset Categories); a blank start is the
 * purchase date. Read by the depreciation reports only.
 */
export function AssetDepreciationFields({ values, set }: { values: AssetFormValues; set: Set }): ReactNode {
  return (
    <fieldset className="col-span-2 grid grid-cols-2 gap-4 rounded-md border p-3">
      <legend className="px-1 text-sm font-medium">Depreciation (leave blank to use the category&apos;s)</legend>
      <div className="space-y-2">
        <Label htmlFor="asset-dep-start">Depreciation from</Label>
        <Input id="asset-dep-start" type="date" value={values.depStart} onChange={(e) => set({ depStart: e.target.value })} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="asset-dep-method">Method</Label>
        <Select id="asset-dep-method" value={values.depMethod} onChange={(e) => set({ depMethod: e.target.value })}>
          <option value="">The category&apos;s</option>
          <option value="slm">Straight line</option>
          <option value="wdv">Written-down value</option>
        </Select>
      </div>
      <NumberField id="asset-dep-rate" label="Rate %" value={values.depRate} onChange={(depRate) => set({ depRate })} />
      <NumberField id="asset-dep-life" label="Useful life (years)" value={values.depLife} step="1" onChange={(depLife) => set({ depLife })} />
      <NumberField id="asset-dep-residual" label="Residual value % of cost" value={values.depResidual} onChange={(depResidual) => set({ depResidual })} />
    </fieldset>
  );
}
