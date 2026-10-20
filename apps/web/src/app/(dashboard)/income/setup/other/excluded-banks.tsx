'use client';

import { type ReactNode } from 'react';
import { useBankAccounts } from '@/hooks/use-bank';
import { friendlyError } from '@/lib/api-error';
import { toggleExcluded } from './document-options';

interface ExcludedBanksProps {
  excluded: readonly string[];
  change: (excluded: string[]) => void;
  disabled: boolean;
}

const lastFour = (accountNumber: string): string => accountNumber.replace(/\s/g, '').slice(-4);

/**
 * "Do not show in payment instructions" (INC-42): the society's active bank
 * accounts, each with a tick that keeps it out of the bank block printed on
 * invoices.
 */
export function ExcludedBanks({ excluded, change, disabled }: ExcludedBanksProps): ReactNode {
  const query = useBankAccounts();
  const accounts = (query.data ?? []).filter((account) => account.is_active);
  let body: ReactNode;
  if (query.error) body = <p className="text-sm text-muted-foreground">Bank accounts could not be loaded: {friendlyError(query.error)}</p>;
  else if (query.isLoading) body = <p className="text-sm text-muted-foreground">Loading…</p>;
  else if (accounts.length === 0) body = <p className="text-sm text-muted-foreground">No bank accounts yet.</p>;
  else {
    body = (
      <ul className="space-y-1">
        {accounts.map((account) => (
          <li key={account.id}>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="rounded border-input"
                checked={excluded.includes(account.id)}
                disabled={disabled}
                onChange={(e) => change(toggleExcluded(excluded, account.id, e.target.checked))}
              />
              {account.bank_name} ····{lastFour(account.account_number)}
            </label>
          </li>
        ))}
      </ul>
    );
  }
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">Do not show in payment instructions</legend>
      {body}
    </fieldset>
  );
}
