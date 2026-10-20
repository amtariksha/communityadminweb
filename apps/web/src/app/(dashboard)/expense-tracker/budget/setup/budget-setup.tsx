'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { type ReactNode } from 'react';
import {
  EditableGrid,
  rowErrorsFromApi,
  type GridChange,
  type GridColumn,
  type GridRowState,
  type GridSaveResult,
} from '@/components/editable-grid';
import { ShowLogsButton } from '@/components/show-logs';
import { useToast } from '@/components/ui/toast';
import { useBudget, useSaveBudgets } from '@/hooks/use-budgets';
import { friendlyError } from '@/lib/api-error';
import { canWriteFinance } from '@/lib/finance-roles';
import { useAdminLayout } from '@/lib/layout-context';
import { amountIssue, budgetGridRows, budgetSaveRows, type BudgetGridValues } from '../budget-model';

const blank = (): BudgetGridValues => ({ groupName: '', accountName: '', code: '', amount: '', firstOfGroup: false });

const COLUMNS: GridColumn<BudgetGridValues>[] = [
  // The group name spans its rows: written on the first row of each group.
  { key: 'group', header: 'Group Name', kind: 'custom', render: ({ row }) => <span className="font-medium">{row.values.firstOfGroup ? row.values.groupName : ''}</span> },
  { key: 'account', header: 'Account Name', kind: 'custom', render: ({ row }) => <span>{row.values.accountName}</span> },
  { key: 'code', header: 'GL Account No', kind: 'custom', render: ({ row }) => <span className="tabular-nums">{row.values.code}</span> },
  {
    key: 'amount',
    header: 'Budgeted Amount',
    kind: 'text',
    field: 'amount',
    placeholder: '0.00',
    className: 'w-44',
    label: (position) => `Budgeted Amount, row ${position}`,
  },
];

export function validateBudgetGrid(rows: readonly GridRowState<BudgetGridValues>[]): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const row of rows) {
    const issue = amountIssue(row.values.amount);
    if (issue) errors[row.key] = issue;
  }
  return errors;
}

/**
 * Expense Tracker › Budget › Setup (EXP-S14): every expense head of the
 * year in one editable grid (SB-08), grouped by account group, one Save
 * Changes. Read only for finance readers and while the year is frozen.
 */
export function BudgetSetup(): ReactNode {
  const params = useSearchParams();
  const yearId = params.get('fy') ?? '';
  const budget = useBudget(yearId);
  const save = useSaveBudgets();
  const { addToast } = useToast();
  // In classic the module frame carries Show Logs.
  const classic = useAdminLayout() === 'classic';

  if (budget.isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (budget.data === null) return <p className="text-sm text-muted-foreground">The budget is not available yet.</p>;
  if (budget.error || !budget.data) return <p role="alert" className="text-sm text-destructive">Could not load the budget.</p>;

  const list = budget.data;
  const year = list.financial_year;
  const readOnly = !canWriteFinance() || year.is_frozen;

  async function onSave(change: GridChange<BudgetGridValues>): Promise<GridSaveResult | void> {
    try {
      const result = await save.mutateAsync({ financial_year_id: year.id, rows: budgetSaveRows(change.rows) });
      addToast({ title: result.changed ? `Budget saved (${result.changed} heads changed)` : 'Nothing changed', variant: 'success' });
    } catch (error) {
      addToast({ title: 'Could not save the budget', description: friendlyError(error), variant: 'destructive' });
      return { rowErrors: rowErrorsFromApi(error, change) };
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">
          Budget from {year.start_date} to {year.end_date}
        </h2>
        {!classic && <ShowLogsButton recordTypes={['expense_budget']} />}
      </div>
      {year.is_frozen && <p className="text-sm text-muted-foreground">This financial year is frozen; its budget cannot change.</p>}
      {list.data.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No expense heads — add them in <Link className="underline" href="/accounts">General Ledger › Chart of Accounts</Link>.
        </p>
      ) : (
        <EditableGrid
          // Re-mounted with the saved figures once they come back.
          key={list.data.map((row) => `${row.ledger_account_id}:${row.budget}`).join('|')}
          label="Budget setup"
          serialHeader="Sl.No"
          columns={COLUMNS}
          rows={budgetGridRows(list.data)}
          blank={blank}
          spareRows={0}
          validate={validateBudgetGrid}
          readOnly={readOnly}
          isSaving={save.isPending}
          onSave={onSave}
        />
      )}
    </div>
  );
}
