'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { FormFieldError } from '@/components/ui/form-field-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import type { MemberCategory } from '@/hooks';
import type { UnitBillingCategory } from '@/hooks/use-unit-billing-categories';
import { ApiError } from '@/lib/api-error';
import { UnitBillingFields } from './unit-billing-fields';
import { UnitCategorySelect } from './unit-category-select';
import {
  unitEditChanges,
  unitEditErrors,
  unitEditValues,
  type UnitEditErrors,
  type UnitEditValues,
  type UnitRecord,
  type YesNo,
} from './unit-edit-values';

interface UnitEditFormProps {
  unit: UnitRecord;
  categories: MemberCategory[];
  /** The society's unit types for billing; null when the server has none. */
  billingTypes: readonly UnitBillingCategory[] | null;
  /** SB-10 block master names. */
  blocks: readonly string[];
  saving?: boolean;
  /** The save's error, for the fields the server refused. */
  error?: unknown;
  onSave: (changes: Record<string, unknown>) => void;
  /** Buttons beside Save Changes (classic: Show Logs, Close). */
  actions?: ReactNode;
}

type Set = (patch: Partial<UnitEditValues>) => void;

function Field(props: { id: string; label: string; error?: string; children: ReactNode }): ReactNode {
  return (
    <div className="space-y-1">
      <Label htmlFor={props.id}>{props.label}</Label>
      {props.children}
      <FormFieldError message={props.error} />
    </div>
  );
}

function TextInput(props: { id: string; label: string; field: keyof UnitEditValues; values: UnitEditValues; errors: UnitEditErrors; set: Set; type?: string; max?: number }): ReactNode {
  return (
    <Field id={props.id} label={props.label} error={props.errors[props.field]}>
      <Input
        id={props.id}
        type={props.type ?? 'text'}
        maxLength={props.max}
        value={props.values[props.field] as string}
        onChange={(event) => props.set({ [props.field]: event.target.value } as Partial<UnitEditValues>)}
      />
    </Field>
  );
}

function YesNoSelect(props: { id: string; label: string; field: 'meter_in_owner_name' | 'khata_in_owner_name' | 'transfer_amount_received'; values: UnitEditValues; set: Set }): ReactNode {
  return (
    <Field id={props.id} label={props.label}>
      <Select id={props.id} value={props.values[props.field]} onChange={(event) => props.set({ [props.field]: event.target.value as YesNo })}>
        <option value="">—</option>
        <option value="yes">Yes</option>
        <option value="no">No</option>
      </Select>
    </Field>
  );
}

function BlockSelect({ values, errors, set, blocks }: { values: UnitEditValues; errors: UnitEditErrors; set: Set; blocks: readonly string[] }): ReactNode {
  const names = blocks.includes(values.block) || !values.block ? blocks : [values.block, ...blocks];
  return (
    <Field id="unit-edit-block" label="Block *" error={errors.block}>
      <Select id="unit-edit-block" value={values.block} onChange={(event) => set({ block: event.target.value })}>
        <option value="">Choose a block</option>
        {names.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </Select>
    </Field>
  );
}

function serverErrors(error: unknown): UnitEditErrors {
  if (!(error instanceof ApiError) || error.code !== 'unit_number_exists') return {};
  return { unit_number: 'Unit number already exists' };
}

/** UNIT-16 — every unit field the API holds; standard dialog Details tab and classic page. */
export function UnitEditForm(props: UnitEditFormProps): ReactNode {
  const { unit, saving, onSave } = props;
  const [initial, setInitial] = useState(() => unitEditValues(unit));
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<UnitEditErrors>({});
  useEffect(() => {
    const next = unitEditValues(unit);
    setInitial(next);
    setValues(next);
  }, [unit]);
  const set: Set = (patch) => setValues((current) => ({ ...current, ...patch }));
  const shown = { ...serverErrors(props.error), ...errors };
  const common = { values, errors: shown, set };

  function submit(event: FormEvent): void {
    event.preventDefault();
    const found = unitEditErrors(values);
    setErrors(found);
    if (Object.keys(found).length === 0) onSave(unitEditChanges(initial, values, props.billingTypes !== null));
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4 py-2">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextInput id="unit-edit-number" label="Unit Number *" field="unit_number" max={20} {...common} />
        <BlockSelect {...common} blocks={props.blocks} />
        <TextInput id="unit-edit-floor" label="Floor *" field="floor" type="number" {...common} />
        <TextInput id="unit-edit-area" label="Area (sq ft) *" field="area_sqft" type="number" {...common} />
        <Field id="unit-edit-type" label="Unit Type *">
          <Select id="unit-edit-type" value={values.unit_type} onChange={(event) => set({ unit_type: event.target.value })}>
            <option value="residential">Residential</option>
            <option value="commercial">Commercial</option>
            <option value="parking">Parking only</option>
          </Select>
        </Field>
        <TextInput id="unit-edit-apartment" label="Apartment Number" field="apartment_number" max={50} {...common} />
        <TextInput id="unit-edit-bhk" label="BHK Type" field="bhk_type" max={20} {...common} />
        <Field id="unit-edit-occupancy" label="Occupancy">
          <Select id="unit-edit-occupancy" value={values.occupancy_status} onChange={(event) => set({ occupancy_status: event.target.value })}>
            <option value="">—</option>
            <option value="self_occupied">Self occupied</option>
            <option value="rented">Rented</option>
            <option value="empty">Empty</option>
          </Select>
        </Field>
        <TextInput id="unit-edit-intercom" label="Intercom" field="intercom" max={20} {...common} />
        <TextInput id="unit-edit-meter" label="Meter Number" field="meter_number" max={50} {...common} />
        <YesNoSelect id="unit-edit-meter-owner" label="Meter in owner's name" field="meter_in_owner_name" {...common} />
        <YesNoSelect id="unit-edit-khata-owner" label="Khata in owner's name" field="khata_in_owner_name" {...common} />
        <TextInput id="unit-edit-previous" label="Previous Owner" field="previous_owner" max={200} {...common} />
        <YesNoSelect id="unit-edit-transfer" label="Transfer amount received" field="transfer_amount_received" {...common} />
      </div>
      <UnitCategorySelect categories={props.categories} value={values.member_category_id} onChange={(id) => set({ member_category_id: id })} />
      <UnitBillingFields
        types={props.billingTypes}
        typeId={values.billing_category_id}
        onTypeChange={(id) => set({ billing_category_id: id })}
        area2={values.garden_area}
        onArea2Change={(garden_area) => set({ garden_area })}
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label htmlFor="unit-edit-active" className="flex items-center gap-2 text-sm">
          <input id="unit-edit-active" type="checkbox" checked={values.is_active} onChange={(event) => set({ is_active: event.target.checked })} />
          Active
        </label>
        <p className="text-xs text-muted-foreground">
          Parking slot: {unit.parking_slot || '—'}{' '}
          <Link href="/parking" className="text-primary hover:underline">
            Parking Manager
          </Link>
        </p>
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        {props.actions}
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}
