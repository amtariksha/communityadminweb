'use client';

import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/toast';
import { useBankAccounts } from '@/hooks';
import { useBankSetup, useSaveBankSetup, type BankSetupScreen, type BankSetupSettings } from '@/hooks/use-bank-setup';
import { friendlyError } from '@/lib/api-error';
import { formatCurrency, formatDate } from '@/lib/utils';
import { canChangeSettings } from '../../settings/settings-access';
import { accountLabel, type BankAccountRow } from '../../bank/bank-types';

const SELECT_CLASS = 'flex h-10 w-72 rounded-md border border-input bg-background px-3 text-sm disabled:opacity-60';

function SettingsForm({ screen, editable }: { screen: BankSetupScreen; editable: boolean }): ReactNode {
  const { addToast } = useToast();
  const save = useSaveBankSetup();
  const banks = ((useBankAccounts().data ?? []) as unknown as BankAccountRow[]).filter((account) => account.is_active !== false && account.account_kind !== 'petty_cash');
  const [draft, setDraft] = useState<BankSetupSettings>(screen.settings);
  const set = (patch: Partial<BankSetupSettings>): void => setDraft((current) => ({ ...current, ...patch }));
  const missingBank = draft.bank_pg_auto_reconcile && !draft.bank_pg_settlement_account_id;
  const toggleBlocked = (userId: string, blocked: boolean): void =>
    set({ bank_reconcile_blocked_user_ids: blocked ? [...draft.bank_reconcile_blocked_user_ids, userId] : draft.bank_reconcile_blocked_user_ids.filter((id) => id !== userId) });

  function submit(): void {
    if (missingBank) return;
    save.mutate(draft, {
      onSuccess: () => addToast({ title: 'Bank & Cash Setup saved', variant: 'success' }),
      onError: (error) => addToast({ title: 'Could not save the setup', description: friendlyError(error), variant: 'destructive' }),
    });
  }

  return (
    <div className="space-y-4">
      {!editable && <p role="note" className="text-sm text-muted-foreground">Only the society&apos;s administrator can change these settings.</p>}
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" disabled={!editable} checked={draft.bank_pg_auto_reconcile} onChange={(e) => set({ bank_pg_auto_reconcile: e.target.checked })} />
        Enable automatic payment-gateway reconciliation
      </label>
      <div className="space-y-1">
        <Label htmlFor="setup-settlement">Bank account that receives gateway payments</Label>
        <select id="setup-settlement" className={SELECT_CLASS} disabled={!editable} value={draft.bank_pg_settlement_account_id ?? ''} onChange={(e) => set({ bank_pg_settlement_account_id: e.target.value || null })}>
          <option value="">The society&apos;s bank ledger (as today)</option>
          {banks.map((account) => <option key={account.id} value={account.id}>{accountLabel(account)}</option>)}
        </select>
        {missingBank && <p role="alert" className="text-xs text-destructive">Choose the bank account that receives gateway payments.</p>}
      </div>
      <fieldset className="space-y-1">
        <legend className="text-sm font-medium">Users who may not reconcile</legend>
        {screen.admin_users.map((user) => (
          <label key={user.user_id} className="flex items-center gap-2 text-sm">
            <input type="checkbox" disabled={!editable} checked={draft.bank_reconcile_blocked_user_ids.includes(user.user_id)} onChange={(e) => toggleBlocked(user.user_id, e.target.checked)} />
            {user.name ?? 'Unnamed user'} <span className="text-muted-foreground">({user.roles.join(', ')})</span>
          </label>
        ))}
      </fieldset>
      {editable && <Button type="button" disabled={save.isPending || missingBank} onClick={submit}>{save.isPending ? 'Saving…' : 'Save'}</Button>}
    </div>
  );
}

function AccountsTable({ accounts }: { accounts: BankSetupScreen['accounts'] }): ReactNode {
  if (accounts.length === 0) return <p className="text-sm text-muted-foreground">No bank or petty-cash accounts yet.</p>;
  return (
    <Table aria-label="Bank & Petty Cash Accounts">
      <TableHeader>
        <TableRow>{['Sl.No', 'GL No.', 'Account Name', 'Type', 'Opening Balance', 'Opening Balance Date'].map((head) => <TableHead key={head}>{head}</TableHead>)}</TableRow>
      </TableHeader>
      <TableBody>
        {accounts.map((account, index) => (
          <TableRow key={account.id}>
            <TableCell>{index + 1}</TableCell>
            <TableCell>{account.gl_no ?? ''}</TableCell>
            <TableCell>{account.account_name}</TableCell>
            <TableCell>{account.type}</TableCell>
            <TableCell className="text-right">{formatCurrency(account.opening_balance)}</TableCell>
            <TableCell>{account.opening_balance_date ? formatDate(account.opening_balance_date) : '—'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/**
 * Bank & Cash › Setup (BANK-17, screen BANK-S1): the accounting start date,
 * Bank Reconciliation Settings (gateway auto-reconciliation and its bank
 * account, users barred from reconciling) — saved by the community admin,
 * read-only for everyone else — and the bank and petty-cash accounts.
 */
export function BankSetupPage(): ReactNode {
  const query = useBankSetup();
  const editable = canChangeSettings();
  if (query.isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (query.isError) return <p role="alert" className="text-sm text-destructive">The setup could not be loaded.</p>;
  if (query.data === null) return <p role="note" className="text-sm text-muted-foreground">Bank & Cash Setup is not available yet on this server.</p>;
  const screen = query.data as BankSetupScreen;
  if (!screen.accounting_start_date) return <p className="text-sm text-muted-foreground">Set up a financial year in General Ledger first.</p>;
  return (
    <div className="space-y-4">
      <p className="text-sm">Accounting start date: {formatDate(screen.accounting_start_date)}</p>
      <Card>
        <CardHeader><CardTitle className="text-base">Bank Reconciliation Settings</CardTitle></CardHeader>
        <CardContent><SettingsForm key={JSON.stringify(screen.settings)} screen={screen} editable={editable} /></CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Bank &amp; Petty Cash Accounts</CardTitle></CardHeader>
        <CardContent><AccountsTable accounts={screen.accounts} /></CardContent>
      </Card>
    </div>
  );
}
