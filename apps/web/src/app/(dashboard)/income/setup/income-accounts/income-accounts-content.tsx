'use client';

import Link from 'next/link';
import { useMemo, useState, type ReactNode } from 'react';
import {
  EditableGrid,
  rowErrorsFromApi,
  type GridChange,
  type GridColumn,
  type GridSaveResult,
  type SavedGridRow,
} from '@/components/editable-grid';
import { useToast } from '@/components/ui/toast';
import { useIncomeAccounts, useSaveIncomeAccounts, type IncomeAccount, type IncomeAccountScope } from '@/hooks/use-income-accounts';
import { friendlyError } from '@/lib/api-error';
import { canWriteFinance } from '@/lib/finance-roles';
import { isNotDeployed } from '@/lib/not-deployed';

export interface IncomeAccountValues {
  code: string;
  name: string;
  scope: IncomeAccountScope;
  order: string;
  hsn: string;
}

const SCOPE_OPTIONS = [
  { value: 'member', label: 'Member' },
  { value: 'non_member', label: 'Non-member' },
  { value: 'both', label: 'Both' },
] as const;

const ORDER = /^\d{1,3}$/;
const HSN = /^\d{4}(\d{2}){0,2}$/;

export function toIncomeRows(accounts: readonly IncomeAccount[]): SavedGridRow<IncomeAccountValues>[] {
  return accounts.map((account) => ({
    id: account.id,
    values: {
      code: account.code ?? '',
      name: account.is_system ? `${account.name} *` : account.name,
      scope: account.income_scope,
      order: account.invoice_display_order === null ? '' : String(account.invoice_display_order),
      hsn: account.hsn_sac ?? '',
    },
  }));
}

/** Row errors before anything is sent: display order 1–999, HSN/SAC 4, 6 or 8 digits. */
export function checkIncomeRows(rows: ReadonlyArray<{ key: string; values: IncomeAccountValues }>): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const row of rows) {
    const order = row.values.order.trim();
    if (order && (!ORDER.test(order) || Number(order) < 1)) errors[row.key] = 'Display order is 1 to 999.';
    else if (row.values.hsn.trim() && !HSN.test(row.values.hsn.trim())) errors[row.key] = 'HSN/SAC is 4, 6 or 8 digits.';
  }
  return errors;
}

const COLUMNS: GridColumn<IncomeAccountValues>[] = [
  { key: 'code', header: 'GL No.', kind: 'custom', render: (cell) => <span className="font-mono text-xs">{cell.row.values.code}</span> },
  { key: 'name', header: 'Account Name', kind: 'custom', render: (cell) => cell.row.values.name },
  { key: 'scope', header: 'Used for', kind: 'select', field: 'scope', options: SCOPE_OPTIONS, placeholder: 'Member' },
  { key: 'order', header: 'Invoice Display Order', kind: 'number', field: 'order', min: 1, max: 999, step: 1 },
  { key: 'hsn', header: 'HSN/SAC', kind: 'text', field: 'hsn', maxLength: 8 },
];

function IncomeGrid({ title, accounts, canWrite }: { title: string; accounts: readonly IncomeAccount[]; canWrite: boolean }): ReactNode {
  const { addToast } = useToast();
  const save = useSaveIncomeAccounts();
  const [version, setVersion] = useState(0);

  async function onSave(change: GridChange<IncomeAccountValues>): Promise<GridSaveResult | void> {
    const changed = change.upserts.filter((row) => row.id);
    if (changed.length === 0) return;
    try {
      await save.mutateAsync(
        changed.map((row) => ({
          id: row.id as string,
          income_scope: row.values.scope || 'member',
          invoice_display_order: row.values.order.trim() ? Number(row.values.order) : null,
          hsn_sac: row.values.hsn.trim() || null,
        })),
      );
      addToast({ title: `${title} saved`, variant: 'success' });
      setVersion((n) => n + 1);
    } catch (error) {
      addToast({ title: 'Could not save', description: friendlyError(error), variant: 'destructive' });
      return { rowErrors: rowErrorsFromApi(error, { ...change, rows: changed }) };
    }
  }

  return (
    <section aria-label={title} className="space-y-2">
      <h2 className="text-base font-semibold">{title}</h2>
      <EditableGrid<IncomeAccountValues>
        key={version}
        label={title}
        columns={COLUMNS}
        rows={toIncomeRows(accounts)}
        blank={() => ({ code: '', name: '', scope: 'member', order: '', hsn: '' })}
        spareRows={0}
        readOnly={!canWrite}
        isSaving={save.isPending}
        validate={checkIncomeRows}
        emptyText="No income accounts here."
        onSave={onSave}
      />
    </section>
  );
}

/**
 * Income Tracker › Setup › Income Accounts (INC-S5, INC-38): two grids —
 * accounts used for member invoices (Member or Both) and for non-member
 * invoices — with what each is used for, its invoice display order and its
 * HSN/SAC. Accounts are created in the Chart of Accounts.
 */
export function IncomeAccountsContent(): ReactNode {
  const canWrite = useMemo(() => canWriteFinance(), []);
  const query = useIncomeAccounts();
  if (isNotDeployed(query.error)) return <p className="text-sm text-muted-foreground">Income accounts are not available yet on this server.</p>;
  if (query.error) return <p role="alert" className="text-sm text-destructive">{friendlyError(query.error)}</p>;
  const accounts = query.data ?? [];
  const member = accounts.filter((account) => account.income_scope !== 'non_member');
  const nonMember = accounts.filter((account) => account.income_scope === 'non_member');
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Create income accounts in{' '}
        <Link href="/accounts" className="text-primary hover:underline">
          General Ledger › Chart of Accounts
        </Link>
        . System accounts are marked *. Changing &quot;Used for&quot; moves an account to the other list after saving.
      </p>
      {query.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <IncomeGrid key={`member-${query.dataUpdatedAt}`} title="Member Income Accounts" accounts={member} canWrite={canWrite} />
          <IncomeGrid key={`non-member-${query.dataUpdatedAt}`} title="Non-Member Income Accounts" accounts={nonMember} canWrite={canWrite} />
        </>
      )}
    </div>
  );
}
