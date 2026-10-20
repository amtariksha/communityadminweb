'use client';

import { useRef, useState, type ReactNode } from 'react';
import { Save } from 'lucide-react';
import type { AccountGroup } from '@communityos/shared';
import { Button } from '@/components/ui/button';
import { rowErrorsFromApi, type GridChange, type GridRowState } from '@/components/editable-grid';
import type { AccountBulkRow, ChartAccount } from '@/hooks/use-chart-of-accounts';
import { AccountGrid, toAccountRows, validateAccounts, type AccountGridExtras, type AccountValues } from './account-grid';
import type { ChartTab } from './chart-types';

type GridState = { change: GridChange<AccountValues>; rows: readonly GridRowState<AccountValues>[] };

interface IncomeGridsProps {
  tab: ChartTab;
  groups: readonly AccountGroup[];
  accounts: readonly ChartAccount[];
  bankChoices: ReadonlyArray<{ id: string; label: string }>;
  readOnly: boolean;
  isSaving: boolean;
  save: (rows: AccountBulkRow[], deactivations: string[]) => Promise<unknown>;
  onNothingToSave: () => void;
}

const SIDES = [
  { scope: 'member', label: 'Set up Member Income Accounts' },
  { scope: 'non_member', label: 'Set up Non-Member Income Accounts' },
] as const;

/** Member grid: member and both (unset reads as member); non-member grid: non-member only. */
function accountsFor(accounts: readonly ChartAccount[], scope: 'member' | 'non_member'): ChartAccount[] {
  return accounts.filter((account) => ((account.income_scope ?? 'member') === 'non_member') === (scope === 'non_member'));
}

// The API numbers the rows it was sent: the member grid's first, then the non-member grid's.
function errorsFor(error: unknown, change: GridChange<AccountValues>, offsets: { rows: number; deactivations: number }): Record<string, string> {
  const pad = <T,>(count: number, list: T[]): Array<T | { key: string }> => [...Array.from({ length: count }, () => ({ key: '' })), ...list];
  const shifted = {
    ...change,
    rows: pad(offsets.rows, change.upserts),
    deactivations: pad(offsets.deactivations, change.deactivations),
  } as GridChange<AccountValues>;
  const { '': _padding, ...found } = { ...rowErrorsFromApi(error, shifted), ...rowErrorsFromApi(error, shifted, 'deactivations') };
  return found;
}

/**
 * Chart of Accounts › Income (GL-S3, GL-18): two grids — member and
 * non-member income heads — with the Default Bank Account column and one
 * Save Changes for both. A new row takes its grid's side.
 */
export function IncomeGrids(props: IncomeGridsProps): ReactNode {
  const states = useRef(new Map<string, GridState>());
  const [errors, setErrors] = useState<Record<string, Record<string, string>>>({});
  const extras = (scope: 'member' | 'non_member'): AccountGridExtras => ({ bank: { header: 'Default Bank Account', choices: props.bankChoices }, scope });

  async function saveBoth(): Promise<void> {
    const found = Object.fromEntries(SIDES.map(({ scope }) => [scope, validateAccounts(states.current.get(scope)?.rows ?? [], false)]));
    setErrors(found);
    if (Object.values(found).some((side) => Object.keys(side).length > 0)) return;
    const changes = SIDES.map(({ scope }) => states.current.get(scope)?.change ?? { rows: [], upserts: [], deactivations: [] });
    const rows = SIDES.flatMap(({ scope }, index) => toAccountRows(changes[index], false, extras(scope)));
    const deactivations = changes.flatMap((change) => change.deactivations.flatMap((row) => (row.id ? [row.id] : [])));
    if (rows.length + deactivations.length === 0) return props.onNothingToSave();
    try {
      await props.save(rows, deactivations);
    } catch (error) {
      const first = { rows: changes[0].upserts.length, deactivations: changes[0].deactivations.length };
      setErrors({ member: errorsFor(error, changes[0], { rows: 0, deactivations: 0 }), non_member: errorsFor(error, changes[1], first) });
    }
  }

  return (
    <div className="space-y-6">
      {SIDES.map(({ scope, label }) => (
        <section key={scope} className="space-y-2">
          <h4 className="font-medium">{label}</h4>
          <AccountGrid
            tab={props.tab}
            label={label}
            groups={props.groups}
            accounts={accountsFor(props.accounts, scope)}
            readOnly={props.readOnly}
            isSaving={props.isSaving}
            extras={extras(scope)}
            save={props.save}
            onNothingToSave={props.onNothingToSave}
            shared={{ hideSave: true, errors: errors[scope] ?? {}, onChange: (state) => states.current.set(scope, state) }}
          />
        </section>
      ))}
      {!props.readOnly && (
        <Button type="button" disabled={props.isSaving} onClick={() => void saveBoth()}>
          <Save className="mr-1 h-4 w-4" /> {props.isSaving ? 'Saving…' : 'Save Changes'}
        </Button>
      )}
    </div>
  );
}
