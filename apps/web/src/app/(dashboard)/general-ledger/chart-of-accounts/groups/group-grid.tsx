'use client';

import { type ReactNode } from 'react';
import type { AccountGroup, AccountType } from '@communityos/shared';
import {
  EditableGrid,
  type GridCellProps,
  type GridChange,
  type GridColumn,
  type GridRowState,
} from '@/components/editable-grid';
import type { GroupBulkRow } from '@/hooks/use-chart-of-accounts';

/** One of the four grids of Groups (GL-S5). */
export interface GroupGridSpec {
  slug: 'assets' | 'liabilities' | 'income' | 'expense';
  label: string;
  // The type a new top-level row gets.
  type: Exclude<AccountType, 'equity'>;
  // Types listed: equity groups sit in Liabilities (decision G3).
  types: readonly AccountType[];
}

export const GROUP_GRIDS: readonly GroupGridSpec[] = [
  { slug: 'assets', label: 'Assets', type: 'asset', types: ['asset'] },
  { slug: 'liabilities', label: 'Liabilities', type: 'liability', types: ['liability', 'equity'] },
  { slug: 'income', label: 'Income', type: 'income', types: ['income'] },
  { slug: 'expense', label: 'Expense', type: 'expense', types: ['expense'] },
];

export interface GroupValues {
  code: string;
  name: string;
  parent_id: string;
  // Fixed for a saved group; a new row takes its parent's type.
  type: AccountType | '';
}

export type GridState = { change: GridChange<GroupValues>; rows: readonly GridRowState<GroupValues>[] };

const blank = (): GroupValues => ({ code: '', name: '', parent_id: '', type: '' });
export const isBlankGroup = (values: GroupValues): boolean => !values.code.trim() && !values.name.trim() && !values.parent_id;
const SELECT_CLASS = 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-60';

export const savedGroupRows = (groups: readonly AccountGroup[]) =>
  groups.map((group) => ({
    id: group.id,
    values: { code: group.code ?? '', name: group.name, parent_id: group.parent_id ?? '', type: group.type },
  }));

/** The type a row is saved with: its own, else its parent's, else the grid's. */
export function rowType(values: GroupValues, spec: GroupGridSpec, groups: readonly AccountGroup[]): GroupBulkRow['type'] {
  if (values.type) return values.type;
  return groups.find((group) => group.id === values.parent_id)?.type ?? spec.type;
}

export function toGroupRow(row: { id?: string; values: GroupValues }, spec: GroupGridSpec, groups: readonly AccountGroup[]): GroupBulkRow {
  return {
    ...(row.id ? { id: row.id } : {}),
    type: rowType(row.values, spec, groups),
    code: row.values.code.trim(),
    name: row.values.name.trim(),
    parent_id: row.values.parent_id || null,
  };
}

function ParentCell({ cell, parents, label }: { cell: GridCellProps<GroupValues>; parents: readonly AccountGroup[]; label: string }): ReactNode {
  const own = cell.row.values.type;
  const options = parents.filter((group) => group.id !== cell.row.id && (!own || group.type === own));
  return (
    <select
      aria-label={`${label} parent group, row ${cell.position}`}
      className={SELECT_CLASS}
      disabled={cell.disabled}
      value={cell.row.values.parent_id}
      onChange={(event) => cell.change({ parent_id: event.target.value })}
    >
      <option value="">— Top level —</option>
      {options.map((group) => (
        <option key={group.id} value={group.id}>
          {`${group.code ? `${group.code} — ` : ''}${group.name}`}
        </option>
      ))}
    </select>
  );
}

function columns(spec: GroupGridSpec, parents: readonly AccountGroup[]): GridColumn<GroupValues>[] {
  return [
    {
      key: 'code',
      header: `${spec.label} - GL No`,
      kind: 'custom',
      render: (cell) => (
        <div className="flex items-center gap-2">
          <input
            aria-label={`${spec.label} - GL No, row ${cell.position}`}
            className="flex h-10 w-28 rounded-md border border-input bg-background px-3 py-2 text-sm"
            maxLength={20}
            disabled={cell.disabled}
            value={cell.row.values.code}
            onChange={(event) => cell.change({ code: event.target.value })}
          />
          {cell.row.values.type === 'equity' && <span className="text-xs text-muted-foreground">(Equity)</span>}
        </div>
      ),
    },
    { key: 'name', header: 'Name', kind: 'text', field: 'name', maxLength: 255, label: (row) => `${spec.label} name, row ${row}` },
    { key: 'parent', header: 'Parent Group', kind: 'custom', render: (cell) => <ParentCell cell={cell} parents={parents} label={spec.label} /> },
  ];
}

interface GroupGridProps {
  spec: GroupGridSpec;
  groups: readonly AccountGroup[];
  readOnly: boolean;
  errors: Record<string, string>;
  onChange: (state: GridState) => void;
}

/** One type's groups on the shared editable grid; the page saves all four at once. */
export function GroupGrid({ spec, groups, readOnly, errors, onChange }: GroupGridProps): ReactNode {
  const own = groups.filter((group) => group.is_active && spec.types.includes(group.type));
  return (
    <section className="space-y-2">
      <h4 className="font-medium">{spec.label}</h4>
      <EditableGrid
        label={`${spec.label} groups`}
        columns={columns(spec, own)}
        rows={savedGroupRows(own)}
        blank={blank}
        isBlank={isBlankGroup}
        spareRows={3}
        readOnly={readOnly}
        deactivate={{ header: 'Delete', label: 'Delete' }}
        hideSave
        errors={errors}
        onChange={onChange}
      />
    </section>
  );
}
