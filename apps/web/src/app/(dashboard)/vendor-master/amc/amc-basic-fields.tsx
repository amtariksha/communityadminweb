'use client';

import { type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAssetCategories } from '@/hooks/use-asset-categories';
import { useAssetRegister } from '@/hooks/use-asset-register';
import { useVendors } from '@/hooks/use-vendors';
import type { AmcFormValues } from './amc-form-values';

export type SetAmc = (patch: Partial<AmcFormValues>) => void;

// Every active vendor is offered, as the bill forms offer them.
const VENDOR_LIMIT = 500;

function Field(props: { id: string; label: string; children: ReactNode; wide?: boolean }): ReactNode {
  return (
    <div className={props.wide ? 'col-span-2 space-y-2' : 'space-y-2'}>
      <Label htmlFor={props.id}>{props.label}</Label>
      {props.children}
    </div>
  );
}

function VendorField({ values, set, onAddVendor }: { values: AmcFormValues; set: SetAmc; onAddVendor: () => void }): ReactNode {
  const vendors = useVendors({ is_active: true, limit: VENDOR_LIMIT });
  const list = vendors.data?.data ?? [];
  const missing = values.vendorId && !list.some((vendor) => vendor.id === values.vendorId);
  return (
    <Field id="amc-vendor" label="Vendor Name *">
      <div className="flex gap-2">
        <Select
          id="amc-vendor"
          value={values.vendorId}
          onChange={(e) => set({ vendorId: e.target.value, vendorName: list.find((vendor) => vendor.id === e.target.value)?.name ?? '' })}
        >
          <option value="">Choose a vendor</option>
          {missing && <option value={values.vendorId}>{values.vendorName || 'Current vendor'}</option>}
          {list.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}
        </Select>
        <Button type="button" variant="outline" onClick={onAddVendor}>+ Add Vendor</Button>
      </div>
    </Field>
  );
}

/** Assets of the chosen category, ticked to be covered (VEND-S8). */
function AssetsField({ values, set }: { values: AmcFormValues; set: SetAmc }): ReactNode {
  const assets = useAssetRegister({ category: values.categoryId || undefined, page: 1, limit: 100 });
  const rows = values.categoryId ? (assets.data?.data ?? []) : [];
  const toggle = (id: string): void =>
    set({ assetIds: values.assetIds.includes(id) ? values.assetIds.filter((other) => other !== id) : [...values.assetIds, id] });
  return (
    <div className="col-span-2 space-y-2">
      <Label>Assets</Label>
      {!values.categoryId && <p className="text-xs text-muted-foreground">Choose an asset category to pick its assets.</p>}
      {values.categoryId && rows.length === 0 && <p className="text-xs text-muted-foreground">No assets in this category.</p>}
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
      {values.assetIds.length > 0 && <p className="text-xs text-muted-foreground">{values.assetIds.length} asset(s) covered.</p>}
    </div>
  );
}

interface BasicFieldsProps {
  values: AmcFormValues;
  set: SetAmc;
  onAddVendor: () => void;
  onAddCategory: () => void;
}

/** Basic Details (VEND-S8): title, vendor, asset category and assets, dates, key terms, cost, reminder days. */
export function AmcBasicFields({ values, set, onAddVendor, onAddCategory }: BasicFieldsProps): ReactNode {
  const categories = useAssetCategories().data ?? [];
  return (
    <fieldset className="grid grid-cols-2 gap-4">
      <legend className="col-span-2 mb-2 text-sm font-semibold">Basic Details</legend>
      <Field id="amc-title" label="Contract Title *" wide>
        <Input id="amc-title" maxLength={255} value={values.title} onChange={(e) => set({ title: e.target.value })} />
      </Field>
      <div className="col-span-2"><VendorField values={values} set={set} onAddVendor={onAddVendor} /></div>
      <Field id="amc-category" label="Asset Category" wide>
        <div className="flex gap-2">
          <Select id="amc-category" value={values.categoryId} onChange={(e) => set({ categoryId: e.target.value })}>
            <option value="">None</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </Select>
          <Button type="button" variant="outline" onClick={onAddCategory}>+ Add Asset Category</Button>
        </div>
      </Field>
      <AssetsField values={values} set={set} />
      <Field id="amc-start" label="Contract Start Date *">
        <Input id="amc-start" type="date" value={values.startDate} onChange={(e) => set({ startDate: e.target.value })} />
      </Field>
      <Field id="amc-end" label="Contract End Date *">
        <Input id="amc-end" type="date" value={values.endDate} onChange={(e) => set({ endDate: e.target.value })} />
      </Field>
      <p className="col-span-2 text-xs text-muted-foreground">
        The society&apos;s community admins, committee members and accountants can see this contract.
      </p>
      <Field id="amc-terms" label="Key Terms" wide>
        <Textarea id="amc-terms" maxLength={5000} value={values.keyTerms} onChange={(e) => set({ keyTerms: e.target.value })} />
      </Field>
      <Field id="amc-cost" label="Cost">
        <Input id="amc-cost" type="number" min="0" step="0.01" value={values.cost} onChange={(e) => set({ cost: e.target.value })} />
      </Field>
      <Field id="amc-reminder" label="Reminder days before end">
        <Input id="amc-reminder" type="number" min="1" max="365" value={values.reminderDays} onChange={(e) => set({ reminderDays: e.target.value })} />
      </Field>
    </fieldset>
  );
}
