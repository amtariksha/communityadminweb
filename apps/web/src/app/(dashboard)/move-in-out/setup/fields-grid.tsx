'use client';

import { type ReactNode } from 'react';
import { EditableGrid, rowErrorsFromApi, type GridCellProps, type GridChange, type GridColumn, type GridSaveResult } from '@/components/editable-grid';
import { Input } from '@/components/ui/input';
import type { FieldAppliesTo, FieldDef, SaveFieldDefsInput } from '@/hooks/use-resident-fields';
import { CHOICE_TYPES, rowValues, toFieldRows, validateFieldRows, type FieldRowValues } from './fields-grid-rules';

const SELECT_CLASS =
  'flex h-10 w-full rounded-md border border-input bg-background px-2 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50';

const TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'date', label: 'Date' },
  { value: 'single', label: 'Single' },
  { value: 'multiple', label: 'Multiple' },
] as const;

function NameCell({ row, disabled, label, change }: GridCellProps<FieldRowValues>): ReactNode {
  if (row.values.predefined) return <span className="text-sm">{row.values.label}</span>;
  return <Input aria-label={label} maxLength={60} disabled={disabled} value={row.values.label} onChange={(event) => change({ label: event.target.value })} />;
}

function TypeCell({ row, disabled, label, change }: GridCellProps<FieldRowValues>): ReactNode {
  return (
    <select
      aria-label={label}
      className={SELECT_CLASS}
      disabled={disabled || row.values.predefined}
      value={row.values.type}
      onChange={(event) => change({ type: event.target.value as FieldRowValues['type'] })}
    >
      {TYPES.map((type) => (
        <option key={type.value} value={type.value}>
          {type.label}
        </option>
      ))}
    </select>
  );
}

function ChoicesCell({ row, disabled, label, change }: GridCellProps<FieldRowValues>): ReactNode {
  const off = disabled || row.values.predefined || !CHOICE_TYPES.has(row.values.type);
  return <Input aria-label={label} disabled={off} placeholder="Comma separated" value={row.values.choices} onChange={(event) => change({ choices: event.target.value })} />;
}

function appliesColumn(value: FieldAppliesTo, header: string): GridColumn<FieldRowValues> {
  return {
    key: `applies-${value}`,
    header,
    className: 'text-center',
    render: ({ row, disabled, position, change }) => (
      <input
        type="radio"
        name={`applies-${row.key}`}
        aria-label={`${header}, row ${position}`}
        checked={row.values.applies_to === value}
        disabled={disabled}
        onChange={() => change({ applies_to: value })}
      />
    ),
    kind: 'custom',
  };
}

const COLUMNS: GridColumn<FieldRowValues>[] = [
  { key: 'position', header: 'Display Order', kind: 'number', field: 'position', min: 0, max: 99, className: 'w-24' },
  { key: 'label', header: 'Field Name', kind: 'custom', render: NameCell },
  { key: 'enabled', header: 'Enabled?', kind: 'checkbox', field: 'is_enabled' },
  { key: 'type', header: 'Text / Date / Multiple Choice', kind: 'custom', render: TypeCell },
  { key: 'choices', header: 'Multiple Choices', kind: 'custom', render: ChoicesCell },
  appliesColumn('owner', 'Owner'),
  appliesColumn('tenant', 'Tenant'),
  appliesColumn('both', 'Both Owner and Tenant'),
];

const blank = (): FieldRowValues => ({ position: '0', label: '', is_enabled: false, type: 'text', choices: '', applies_to: 'both', predefined: false });

interface FieldsGridProps {
  label: string;
  defs: readonly FieldDef[];
  readOnly: boolean;
  isSaving: boolean;
  save: (rows: SaveFieldDefsInput['rows']) => Promise<unknown>;
}

/** MOVE-S4 / S5 on the shared grid (SB-08): every row is a saved one, the spares included. */
export function FieldsGrid({ label, defs, readOnly, isSaving, save }: FieldsGridProps): ReactNode {
  async function onSave(change: GridChange<FieldRowValues>): Promise<GridSaveResult | void> {
    try {
      await save(toFieldRows(change, defs));
    } catch (error) {
      return { rowErrors: rowErrorsFromApi(error, change) };
    }
  }
  return (
    <EditableGrid
      label={label}
      columns={COLUMNS}
      rows={defs.map((def) => ({ id: def.id, values: rowValues(def) }))}
      blank={blank}
      validate={validateFieldRows}
      spareRows={0}
      readOnly={readOnly}
      isSaving={isSaving}
      onSave={onSave}
    />
  );
}
