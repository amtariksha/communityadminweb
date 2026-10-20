'use client';

import Link from 'next/link';
import { useMemo, type ReactNode } from 'react';
import type { AccountGroup } from '@communityos/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { ExportStrip } from '@/components/data-table/export-strip';
import { printableTable, toTsv, type TextColumn } from '@/components/data-table/table-text';
import { useAccountGroups } from '@/hooks';
import {
  isMoneyLedger,
  useAllLedgerAccounts,
  useSaveAccountsBulk,
  type AccountBulkResult,
  type AccountBulkRow,
  type ChartAccount,
} from '@/hooks/use-chart-of-accounts';
import { DeactivatedAccounts } from '@/components/ledger-accounts/deactivated-accounts';
import { useLedgerSettings } from '@/hooks/use-ledger-settings';
import { formatDate } from '@/lib/utils';
import { ApiError, friendlyError } from '@/lib/api-error';
import { currentRole } from '@/lib/current-role';
import { AccountGrid } from './account-grid';
import { IncomeGrids } from './income-grids';
import { CHART_TABS, type ChartTab } from './chart-types';

const MONEY_TYPES = ['asset'] as const;

// PUT /ledger/accounts/bulk.
const WRITE_ROLES: ReadonlySet<string> = new Set(['super_admin', 'community_admin', 'accountant']);

const TEXT_COLUMNS: TextColumn<ChartAccount>[] = [
  { header: 'Group', text: (account) => account.group_name ?? '' },
  { header: 'GL Account No.', text: (account) => account.code ?? '' },
  { header: 'Account Name', text: (account) => account.name },
];

/** The tab's active groups, plus any inactive one an account still sits in (it may stay there). */
function tabGroups(groups: readonly AccountGroup[], tab: ChartTab, accounts: readonly ChartAccount[]): AccountGroup[] {
  const used = new Set(accounts.map((account) => account.group_id));
  return groups
    .filter((group) => tab.groupTypes.includes(group.type) && (group.is_active || used.has(group.id)))
    .map((group) => (group.is_active ? group : { ...group, name: `${group.name} (inactive)` }))
    .sort((a, b) => String(a.code ?? '').localeCompare(String(b.code ?? '')));
}

function savedText(result: AccountBulkResult): string {
  const parts = [`${result.created} added`, `${result.updated} changed`];
  if (result.deactivated) parts.push(`${result.deactivated} deactivated`);
  return `${parts.join(', ')}, ${result.entries_posted} opening-balance entries posted.`;
}

function AssetNotes({ start }: { start: string | null | undefined }): ReactNode {
  return (
    <div className="space-y-1 text-sm text-muted-foreground">
      <p>Accounting Start Date: {start ? formatDate(start) : 'Not set'}</p>
      <p>
        Bank and petty-cash accounts are set up in{' '}
        <Link href="/bank" className="text-primary underline">
          Bank &amp; Cash
        </Link>
        : a bank ledger needs its bank account record.
      </p>
    </div>
  );
}

/**
 * General Ledger › Chart of Accounts › one type (GL-12, screens GL-S1 to
 * GL-S4): the type's accounts as one editable list with five spare rows and
 * one Save Changes; Assets also edits opening balances (each change posts
 * its delta entry). De-Activate marks rows for the same save; deactivated
 * accounts are listed below with Activate and Delete (GL-14).
 */
export function ChartTabPage({ slug }: { slug: ChartTab['slug'] }): ReactNode {
  const tab = CHART_TABS[slug];
  const { addToast } = useToast();
  const groupsQuery = useAccountGroups();
  const accountsQuery = useAllLedgerAccounts(tab.groupTypes);
  const saveMutation = useSaveAccountsBulk();
  const settingsQuery = useLedgerSettings();
  // GL-18: the bank and cash ledgers a head's money may go through.
  const assetsQuery = useAllLedgerAccounts(MONEY_TYPES);
  const bankChoices = useMemo(
    () => (assetsQuery.data ?? []).filter((account) => account.is_active !== false && isMoneyLedger(account)).map((account) => ({ id: account.id, label: account.name })),
    [assetsQuery.data],
  );
  const canSave = useMemo(() => WRITE_ROLES.has(currentRole() ?? ''), []);
  // Deactivated accounts have their own table (an API older than GL-14 lists them too).
  const accounts = (accountsQuery.data ?? []).filter((account) => account.is_active !== false);

  async function save(rows: AccountBulkRow[], deactivations: string[]): Promise<void> {
    try {
      const result = await saveMutation.mutateAsync({ type: tab.type, rows, ...(deactivations.length > 0 ? { deactivations } : {}) });
      addToast({ title: 'Accounts saved', description: savedText(result.data), variant: 'success' });
      // An API older than GL-14 ignores the deactivations it does not know.
      if (deactivations.length > 0 && result.data.deactivated === undefined) {
        addToast({ title: 'Accounts were not deactivated', description: 'Deactivating accounts is not available yet on this server.', variant: 'destructive' });
      }
    } catch (error) {
      // An API older than GL-12 has no bulk route.
      const missing = error instanceof ApiError && error.status === 404;
      const description = missing ? 'Saving this list is not available yet on this server.' : friendlyError(error);
      addToast({ title: 'Could not save the accounts', description, variant: 'destructive' });
      throw error;
    }
  }

  const loading = groupsQuery.isLoading || accountsQuery.isLoading;
  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <h3 className="font-semibold">{tab.heading}</h3>
        {slug === 'assets' && <AssetNotes start={settingsQuery.data?.accounting_start_date} />}
        {!canSave && <p role="note" className="text-sm text-muted-foreground">Only the community admin and the accountant can change accounts.</p>}
        {canSave && (
          // GL-24: many accounts at once from a sheet.
          <Link href="/general-ledger/chart-of-accounts/upload" className="text-sm text-primary underline">
            Upload accounts from Excel
          </Link>
        )}
        <ExportStrip
          config={{ path: '/ledger/accounts/export', params: { account_type: tab.groupTypes.join(',') }, filename: `chart-of-accounts-${slug}` }}
          rowCount={accounts.length}
          copyText={() => toTsv(TEXT_COLUMNS, accounts)}
          printPage={() => printableTable(tab.heading, TEXT_COLUMNS, accounts)}
        />
        {loading ? (
          <Skeleton className="h-40 w-full" />
        ) : groupsQuery.isError || accountsQuery.isError ? (
          <p role="alert" className="text-sm text-destructive">The accounts could not be loaded. Reload the page to try again.</p>
        ) : slug === 'income' ? (
          <IncomeGrids
            key={accountsQuery.dataUpdatedAt}
            tab={tab}
            groups={tabGroups(groupsQuery.data ?? [], tab, accounts)}
            accounts={accounts}
            bankChoices={bankChoices}
            readOnly={!canSave}
            isSaving={saveMutation.isPending}
            save={save}
            onNothingToSave={() => addToast({ title: 'No changes to save' })}
          />
        ) : (
          <AccountGrid
            // A fresh copy of the saved list resets the grid after Save Changes.
            key={accountsQuery.dataUpdatedAt}
            tab={tab}
            groups={tabGroups(groupsQuery.data ?? [], tab, accounts)}
            accounts={accounts}
            readOnly={!canSave}
            isSaving={saveMutation.isPending}
            accountingStart={settingsQuery.data?.accounting_start_date ?? null}
            // GL-18: an expense head's bank account.
            extras={slug === 'expense' ? { bank: { header: 'Bank Account', choices: bankChoices } } : {}}
            save={save}
            onNothingToSave={() => addToast({ title: 'No changes to save' })}
          />
        )}
        <DeactivatedAccounts types={tab.groupTypes} heading={tab.deactivatedHeading} canChange={canSave} />
      </CardContent>
    </Card>
  );
}
