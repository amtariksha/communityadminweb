'use client';

import { type ReactNode } from 'react';
import type { AccountGroup } from '@communityos/shared';
import {
  EditableGrid,
  rowErrorsFromApi,
  type GridCellProps,
  type GridChange,
  type GridColumn,
  type GridDeactivate,
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
  // GL-19: the day the opening balance is posted on ('' = none).
  opening_balance_date: string;
  // A system account (bank, cash, receivables…) keeps its code and group.
  system: boolean;
}

const blank = (): AccountValues => ({ group_id: '', code: '', name: '', opening_balance: '', opening_balance_date: '', system: false });
const isBlank = (values: AccountValues): boolean =>
  !values.group_id && !values.code.trim() && !values.name.trim() && !values.opening_balance.trim() && !values.opening_balance_date;
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
      opening_balance_date: account.opening_balance_date ?? '',
      system: account.is_system,
    },
  }));
}

function rowProblem(values: AccountValues, withOpening: boolean, start: string | null): string | null {
  if (!values.group_id) return 'Choose a group.';
  if (!values.code.trim()) return 'Enter the GL Account No.';
  if (values.code.trim().length > 20) return 'The GL Account No. is at most 20 characters.';
  if (!values.name.trim()) return 'Enter the account name.';
  if (withOpening && values.opening_balance.trim() && !TWO_DECIMALS.test(values.opening_balance.trim())) {
    return 'The opening balance must be 0 or more, with at most 2 decimals.';
  }
  if (withOpening && start && values.opening_balance_date && values.opening_balance_date < start) {
    return 'The Opening Balance Date is before the accounting start date.';
  }
  return null;
}

export function validateAccounts(rows: readonly GridRowState<AccountValues>[], withOpening: boolean, start: string | null = null): Record<string, string> {
  const errors: Record<string, string> = {};
  const codes = new Map<string, string>();
  for (const row of rows) {
    if (!row.id && isBlank(row.values)) continue;
    const problem = rowProblem(row.values, withOpening, start);
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
    ...(withOpening
      ? { opening_balance: Number(values.opening_balance.trim() || 0), opening_balance_date: values.opening_balance_date || null }
      : {}),
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
    list.push({ key: 'opening-date', header: 'Opening Balance Date', kind: 'custom', render: (cell) => <OpeningDateCell cell={cell} /> });
  }
  return list;
}

function OpeningDateCell({ cell }: { cell: GridCellProps<AccountValues> }): ReactNode {
  return (
    <input
      type="date"
      aria-label={`Opening Balance Date, row ${cell.position}`}
      className="flex h-10 w-40 rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-60"
      disabled={cell.disabled}
      value={cell.row.values.opening_balance_date}
      onChange={(event) => cell.change({ opening_balance_date: event.target.value })}
    />
  );
}

interface AccountGridProps {
  tab: ChartTab;
  groups: readonly AccountGroup[];
  accounts: readonly ChartAccount[];
  readOnly: boolean;
  isSaving: boolean;
  /** GL-19: opening balance dates may not be before it. */
  accountingStart?: string | null;
  /** Resolves when saved; rejects with the API error otherwise. */
  save: (rows: AccountBulkRow[], deactivations: string[]) => Promise<unknown>;
  onNothingToSave: () => void;
}

// GL-14: a saved account other than a system one may be marked De-Activate.
const DEACTIVATE: GridDeactivate<AccountValues> = {
  header: 'De-Activate',
  label: 'De-Activate',
  allowed: (row) => row.id !== undefined && !row.values.system,
};

/** One type of the chart of accounts on the shared editable grid (GL-12, SB-08). */
export function AccountGrid({ tab, groups, accounts, readOnly, isSaving, accountingStart = null, save, onNothingToSave }: AccountGridProps): ReactNode {
  const withOpening = tab.slug === 'assets';

  async function onSave(change: GridChange<AccountValues>): Promise<GridSaveResult | void> {
    if (change.upserts.length === 0 && change.deactivations.length === 0) return onNothingToSave();
    try {
      await save(toAccountRows(change, withOpening), change.deactivations.flatMap((row) => (row.id ? [row.id] : [])));
    } catch (error) {
      // The API numbers the rows it was sent: the upserts, then the deactivations.
      return {
        rowErrors: {
          ...rowErrorsFromApi(error, { ...change, rows: change.upserts }),
          ...rowErrorsFromApi(error, change, 'deactivations'),
        },
      };
    }
  }

  return (
    <EditableGrid
      label={tab.heading}
      columns={columns(groups, withOpening)}
      rows={savedAccountRows(accounts)}
      blank={blank}
      isBlank={isBlank}
      validate={(rows) => validateAccounts(rows, withOpening, accountingStart)}
      spareRows={5}
      deactivate={DEACTIVATE}
      readOnly={readOnly}
      isSaving={isSaving}
      emptyText="No accounts of this type yet. Add them in the blank rows."
      onSave={onSave}
    />
  );
}
