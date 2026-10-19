'use client';

import { type ReactNode } from 'react';
import type { AccountGroup } from '@communityos/shared';
import {
  EditableGrid,
  rowErrorsFromApi,
  type GridCellProps,
  type GridChange,
  type GridColumn,
  type GridRowState,
  type GridSaveResult,
} from '@/components/editable-grid';
import type { AccountBulkRow, ChartAccount } from '@/hooks/use-chart-of-accounts';
import type { ChartTab } from './chart-types';

export interface AccountValues {
  group_id: string;
  code: string;
  name: string;
  opening_balance: string;
  // A system account (bank, cash, receivables…) keeps its code and group.
  system: boolean;
}

const blank = (): AccountValues => ({ group_id: '', code: '', name: '', opening_balance: '', system: false });
const isBlank = (values: AccountValues): boolean =>
  !values.group_id && !values.code.trim() && !values.name.trim() && !values.opening_balance.trim();
const TWO_DECIMALS = /^\d+(\.\d{1,2})?$/;
const SELECT_CLASS = 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-60';

export function savedAccountRows(accounts: readonly ChartAccount[]) {
  return accounts.map((account) => ({
    id: account.id,
    values: {
      group_id: account.group_id,
      code: account.code ?? '',
      name: account.name,
      opening_balance: String(Number(account.opening_balance ?? 0)),
      system: account.is_system,
    },
  }));
}

function rowProblem(values: AccountValues, withOpening: boolean): string | null {
  if (!values.group_id) return 'Choose a group.';
  if (!values.code.trim()) return 'Enter the GL Account No.';
  if (values.code.trim().length > 20) return 'The GL Account No. is at most 20 characters.';
  if (!values.name.trim()) return 'Enter the account name.';
  if (withOpening && values.opening_balance.trim() && !TWO_DECIMALS.test(values.opening_balance.trim())) {
    return 'The opening balance must be 0 or more, with at most 2 decimals.';
  }
  return null;
}

export function validateAccounts(rows: readonly GridRowState<AccountValues>[], withOpening: boolean): Record<string, string> {
  const errors: Record<string, string> = {};
  const codes = new Map<string, string>();
  for (const row of rows) {
    if (!row.id && isBlank(row.values)) continue;
    const problem = rowProblem(row.values, withOpening);
    if (problem) {
      errors[row.key] = problem;
      continue;
    }
    const clash = codes.get(row.values.code.trim());
    if (clash) errors[row.key] = errors[clash] = 'GL Account No. already used';
    else codes.set(row.values.code.trim(), row.key);
  }
  return errors;
}

/** The grid's added and changed rows, as PUT /ledger/accounts/bulk takes them. */
export function toAccountRows(change: GridChange<AccountValues>, withOpening: boolean): AccountBulkRow[] {
  return change.upserts.map(({ id, values }) => ({
    ...(id ? { id } : {}),
    group_id: values.group_id,
    code: values.code.trim(),
    name: values.name.trim(),
    ...(withOpening ? { opening_balance: Number(values.opening_balance.trim() || 0) } : {}),
  }));
}

function groupLabel(group: AccountGroup): string {
  const code = group.code ? `${group.code} — ` : '';
  return `${code}${group.name}${group.type === 'equity' ? ' (Equity)' : ''}`;
}

function GroupCell({ cell, groups }: { cell: GridCellProps<AccountValues>; groups: readonly AccountGroup[] }): ReactNode {
  return (
    <select
      aria-label={`Group, row ${cell.position}`}
      className={SELECT_CLASS}
      disabled={cell.disabled || cell.row.values.system}
      value={cell.row.values.group_id}
      onChange={(event) => cell.change({ group_id: event.target.value })}
    >
      <option value="">Select…</option>
      {groups.map((group) => (
        <option key={group.id} value={group.id}>
          {groupLabel(group)}
        </option>
      ))}
    </select>
  );
}

function CodeCell({ cell }: { cell: GridCellProps<AccountValues> }): ReactNode {
  return (
    <input
      aria-label={`GL Account No., row ${cell.position}`}
      className="flex h-10 w-32 rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-60"
      maxLength={20}
      disabled={cell.disabled || cell.row.values.system}
      value={cell.row.values.code}
      onChange={(event) => cell.change({ code: event.target.value })}
    />
  );
}

function columns(groups: readonly AccountGroup[], withOpening: boolean): GridColumn<AccountValues>[] {
  const list: GridColumn<AccountValues>[] = [
    { key: 'group', header: 'Group', kind: 'custom', render: (cell) => <GroupCell cell={cell} groups={groups} /> },
    { key: 'code', header: 'GL Account No.', kind: 'custom', render: (cell) => <CodeCell cell={cell} /> },
    { key: 'name', header: 'Account Name', kind: 'text', field: 'name', maxLength: 255 },
  ];
  if (withOpening) {
    list.push({ key: 'opening', header: 'Opening Balance', kind: 'number', field: 'opening_balance', min: 0, step: 0.01, className: 'w-40' });
  }
  return list;
}

interface AccountGridProps {
  tab: ChartTab;
  groups: readonly AccountGroup[];
  accounts: readonly ChartAccount[];
  readOnly: boolean;
  isSaving: boolean;
  /** Resolves when saved; rejects with the API error otherwise. */
  save: (rows: AccountBulkRow[]) => Promise<unknown>;
  onNothingToSave: () => void;
}

/** One type of the chart of accounts on the shared editable grid (GL-12, SB-08). */
export function AccountGrid({ tab, groups, accounts, readOnly, isSaving, save, onNothingToSave }: AccountGridProps): ReactNode {
  const withOpening = tab.slug === 'assets';

  async function onSave(change: GridChange<AccountValues>): Promise<GridSaveResult | void> {
    if (change.upserts.length === 0) return onNothingToSave();
    try {
      await save(toAccountRows(change, withOpening));
    } catch (error) {
      // The API numbers the rows it was sent: the upserts.
      return { rowErrors: rowErrorsFromApi(error, { ...change, rows: change.upserts }) };
    }
  }

  return (
    <EditableGrid
      label={tab.heading}
      columns={columns(groups, withOpening)}
      rows={savedAccountRows(accounts)}
      blank={blank}
      isBlank={isBlank}
      validate={(rows) => validateAccounts(rows, withOpening)}
      spareRows={5}
      readOnly={readOnly}
      isSaving={isSaving}
      emptyText="No accounts of this type yet. Add them in the blank rows."
      onSave={onSave}
    />
  );
}
