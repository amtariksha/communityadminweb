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
import { useAllLedgerAccounts, useSaveAccountsBulk, type AccountBulkRow, type ChartAccount } from '@/hooks/use-chart-of-accounts';
import { ApiError, friendlyError } from '@/lib/api-error';
import { currentRole } from '@/lib/current-role';
import { AccountGrid } from './account-grid';
import { CHART_TABS, type ChartTab } from './chart-types';

// PUT /ledger/accounts/bulk.
const WRITE_ROLES: ReadonlySet<string> = new Set(['super_admin', 'community_admin', 'accountant']);

const TEXT_COLUMNS: TextColumn<ChartAccount>[] = [
  { header: 'Group', text: (account) => account.group_name ?? '' },
  { header: 'GL Account No.', text: (account) => account.code ?? '' },
  { header: 'Account Name', text: (account) => account.name },
];

function tabGroups(groups: readonly AccountGroup[], tab: ChartTab): AccountGroup[] {
  return groups
    .filter((group) => group.is_active && tab.groupTypes.includes(group.type))
    .sort((a, b) => String(a.code ?? '').localeCompare(String(b.code ?? '')));
}

function AssetNotes(): ReactNode {
  return (
    <div className="space-y-1 text-sm text-muted-foreground">
      <p>Accounting Start Date: Not set</p>
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
 * its delta entry). Deactivating is GL-14, default bank accounts GL-18.
 */
export function ChartTabPage({ slug }: { slug: ChartTab['slug'] }): ReactNode {
  const tab = CHART_TABS[slug];
  const { addToast } = useToast();
  const groupsQuery = useAccountGroups();
  const accountsQuery = useAllLedgerAccounts(tab.groupTypes);
  const saveMutation = useSaveAccountsBulk();
  const canSave = useMemo(() => WRITE_ROLES.has(currentRole() ?? ''), []);
  const accounts = accountsQuery.data ?? [];

  async function save(rows: AccountBulkRow[]): Promise<void> {
    try {
      const result = await saveMutation.mutateAsync({ type: tab.type, rows });
      const { created, updated, entries_posted: posted } = result.data;
      addToast({ title: 'Accounts saved', description: `${created} added, ${updated} changed, ${posted} opening-balance entries posted.`, variant: 'success' });
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
        {slug === 'assets' && <AssetNotes />}
        {!canSave && <p role="note" className="text-sm text-muted-foreground">Only the community admin and the accountant can change accounts.</p>}
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
        ) : (
          <AccountGrid
            // A fresh copy of the saved list resets the grid after Save Changes.
            key={accountsQuery.dataUpdatedAt}
            tab={tab}
            groups={tabGroups(groupsQuery.data ?? [], tab)}
            accounts={accounts}
            readOnly={!canSave}
            isSaving={saveMutation.isPending}
            save={save}
            onNothingToSave={() => addToast({ title: 'No changes to save' })}
          />
        )}
      </CardContent>
    </Card>
  );
}
