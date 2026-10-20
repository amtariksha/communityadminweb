'use client';

import type { ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { useInventoryCategories } from '@/hooks/use-inventory-setup';
import { MATERIAL_CATEGORIES, MATERIAL_UNITS, type MaterialValues } from './material-form';

type Set = (patch: Partial<MaterialValues>) => void;

function Field(props: { id: string; label: string; hint?: string; children: ReactNode }): ReactNode {
  return (
    <div className="space-y-1">
      <Label htmlFor={props.id}>{props.label}</Label>
      {props.children}
      {props.hint && <p className="text-xs text-muted-foreground">{props.hint}</p>}
    </div>
  );
}

function Amount(props: { id: string; label: string; hint?: string; value: string; onChange: (value: string) => void }): ReactNode {
  return (
    <Field id={props.id} label={props.label} hint={props.hint}>
      <Input id={props.id} type="number" min="0" step="0.01" value={props.value} onChange={(e) => props.onChange(e.target.value)} />
    </Field>
  );
}

interface MaterialFieldsProps {
  values: MaterialValues;
  set: Set;
  /** Add Material (standard) keeps the opening stock; Add Inventory and Edit do not (decision A3). */
  showOpeningStock: boolean;
  nameLabel: string;
}

/** The item's fields (ASSET-S10, ASSET-11): name, vendor, category, unit, location, re-order level and quantity, cost. */
export function MaterialFields({ values, set, showOpeningStock, nameLabel }: MaterialFieldsProps): ReactNode {
  // ASSET-17: the society's active categories (sent by name, which the API matches); the fixed seven before it has them.
  const categories = useInventoryCategories().data?.map((category) => category.name) ?? MATERIAL_CATEGORIES;
  return (
    <div className="space-y-3">
      <Field id="mat-name" label={nameLabel}>
        <Input id="mat-name" maxLength={255} value={values.name} onChange={(e) => set({ name: e.target.value })} required />
      </Field>
      <Field id="mat-vendor" label="Vendor Name *">
        <Input id="mat-vendor" maxLength={255} value={values.vendor_name} onChange={(e) => set({ vendor_name: e.target.value })} required />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field id="mat-category" label="Category">
          <Select id="mat-category" value={values.category} onChange={(e) => set({ category: e.target.value })}>
            {[...new Set([...categories, values.category])].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </Select>
        </Field>
        <Field id="mat-unit" label="Unit of Measure">
          <Select id="mat-unit" value={values.unit} onChange={(e) => set({ unit: e.target.value })}>
            {[...new Set([...MATERIAL_UNITS, values.unit])].map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Amount id="mat-reorder-level" label="Re-order Level" hint="Order more when stock drops below this." value={values.minimum_stock} onChange={(minimum_stock) => set({ minimum_stock })} />
        <Amount id="mat-reorder-qty" label="Re-order Quantity" hint="Usual quantity to order each time." value={values.reorder_quantity} onChange={(reorder_quantity) => set({ reorder_quantity })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Amount id="mat-unit-price" label="Cost per unit (INR)" value={values.unit_price} onChange={(unit_price) => set({ unit_price })} />
        <Field id="mat-location" label="Store Location">
          <Input id="mat-location" maxLength={100} placeholder="e.g. Store Room Rack A-2" value={values.location} onChange={(e) => set({ location: e.target.value })} />
        </Field>
      </div>
      {showOpeningStock && <Amount id="mat-stock" label="Current Stock" value={values.current_stock} onChange={(current_stock) => set({ current_stock })} />}
    </div>
  );
}
