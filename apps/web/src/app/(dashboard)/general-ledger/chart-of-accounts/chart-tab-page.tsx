'use client';

import Link from 'next/link';
import { type ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useAccountGroups } from '@/hooks';
import { useAllLedgerAccounts } from '@/hooks/use-chart-of-accounts';
import { buildTree, TreeNodeView, TreeSkeleton } from '../../accounts/accounts-tree';
import { CHART_TABS, type ChartTab } from './chart-types';

/**
 * General Ledger › Chart of Accounts › one type (GL-09): today's tree,
 * limited to the tab's group types. Accounts are added and edited on the
 * chart of accounts page until the tab becomes an editable list (GL-12).
 */
export function ChartTabPage({ slug }: { slug: ChartTab['slug'] }): ReactNode {
  const tab = CHART_TABS[slug];
  const groupsQuery = useAccountGroups();
  const accountsQuery = useAllLedgerAccounts(tab.groupTypes);
  const groups = (groupsQuery.data ?? []).filter((group) => tab.groupTypes.includes(group.type));
  const tree = buildTree(groups, accountsQuery.data ?? []);
  const loading = groupsQuery.isLoading || accountsQuery.isLoading;

  return (
    <Card>
      <CardContent className="space-y-3 pt-6">
        <h3 className="font-semibold">{tab.heading}</h3>
        <p className="text-sm text-muted-foreground">
          Add or change accounts on the{' '}
          <Link href="/accounts" className="text-primary underline">
            chart of accounts page
          </Link>
          .
        </p>
        {loading ? (
          <TreeSkeleton />
        ) : groupsQuery.isError || accountsQuery.isError ? (
          <p role="alert" className="text-sm text-destructive">
            The accounts could not be loaded. Reload the page to try again.
          </p>
        ) : tree.length === 0 ? (
          <p className="text-sm text-muted-foreground">No accounts of this type yet.</p>
        ) : (
          tree.map((node) => <TreeNodeView key={node.group.id} node={node} depth={0} />)
        )}
      </CardContent>
    </Card>
  );
}
