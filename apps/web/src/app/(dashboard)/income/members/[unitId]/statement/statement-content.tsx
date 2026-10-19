'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useFinanceAccess } from '@/hooks/use-finance-access';
import { useUnitStatement, type StatementAction, type StatementFilters, type StatementRow, type UnitStatement } from '@/hooks/use-unit-statement';
import { isNotDeployed } from '@/lib/not-deployed';
import { cn, formatCurrency } from '@/lib/utils';
import { MEMBER_INCOME_BASE } from '../../member-row-actions';
import { AllocationDialog } from './allocation-dialog';
import { EditDetailsDialog } from './edit-details-dialog';
import { ReverseDialog } from './reverse-dialog';
import { tabFrom, unitLabel, type StatementTab } from './statement-actions';
import { StatementFilterRow } from './statement-filters';
import { StatementFooter } from './statement-footer';
import { StatementTable } from './statement-table';
import { CurrentAdvancesTab, CurrentDueTab, RefundableDepositTab } from './summary-tabs';

interface PendingAction {
  action: StatementAction;
  row: StatementRow;
}

function tabLabels(statement: UnitStatement | undefined): Record<StatementTab, string> {
  const figure = (value: number | undefined): string => (value === undefined ? '' : ` (${formatCurrency(value)})`);
  return {
    due: `Current Due${figure(statement?.summary.current_due)}`,
    advances: `Current Advances${figure(statement?.summary.current_advances)}`,
    deposit: `Refundable Deposit${figure(statement?.summary.refundable_deposit)}`,
    admin: "Admin's Account Statement",
    user: "User's Account Statement",
  };
}

function TabStrip({ active, labels, pathname }: { active: StatementTab; labels: Record<StatementTab, string>; pathname: string }): ReactNode {
  return (
    <nav aria-label="Statement tabs" className="flex flex-wrap gap-1 border-b">
      {(Object.keys(labels) as StatementTab[]).map((tab) => (
        <Link
          key={tab}
          href={`${pathname}?tab=${tab}`}
          aria-current={tab === active ? 'page' : undefined}
          className={cn('px-3 py-2 text-sm', tab === active ? 'border-b-2 border-primary font-semibold' : 'text-muted-foreground')}
        >
          {labels[tab]}
        </Link>
      ))}
    </nav>
  );
}

function ActionDialog({ pending, onClose }: { pending: PendingAction | null; onClose: () => void }): ReactNode {
  if (!pending) return null;
  if (pending.action === 'reverse') return <ReverseDialog row={pending.row} onClose={onClose} />;
  if (pending.action === 'edit') return <EditDetailsDialog row={pending.row} onClose={onClose} />;
  return <AllocationDialog row={pending.row} onClose={onClose} />;
}

/**
 * The account statement of one unit (INC-S17): tabs with their figures,
 * From / To / Show Reversals, the rows with their Actions, and Export,
 * Auto Allocate, Print and Close underneath.
 */
interface StatementContentProps {
  unitId: string;
  /** Member dues (default) or utility dues (Utility Income › View, UTIL-08). */
  scope?: 'member' | 'utility';
  /** Where Close goes; the Member Income list by default. */
  closeHref?: string;
}

export function StatementContent({ unitId, scope = 'member', closeHref = MEMBER_INCOME_BASE }: StatementContentProps): ReactNode {
  const pathname = usePathname();
  const tab = tabFrom(useSearchParams().get('tab'));
  const access = useFinanceAccess();
  const [filters, setFilters] = useState<StatementFilters>({ from: '', to: '', showReversals: false, scope, view: 'admin' });
  const [pending, setPending] = useState<PendingAction | null>(null);
  const view = tab === 'user' ? 'resident' : 'admin';
  const effective: StatementFilters = { ...filters, view, showReversals: view === 'admin' && filters.showReversals };
  const query = useUnitStatement(unitId, effective);
  const statement = query.data;

  if (isNotDeployed(query.error)) {
    return <p className="text-sm text-muted-foreground">The account statement is not available yet on this server.</p>;
  }
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Account Statement for {statement ? unitLabel(statement.unit) : '…'}</h2>
      <TabStrip active={tab} labels={tabLabels(statement)} pathname={pathname} />
      {tab === 'due' && <CurrentDueTab unitId={unitId} scope={filters.scope} />}
      {tab === 'advances' && <CurrentAdvancesTab unitId={unitId} />}
      {tab === 'deposit' && <RefundableDepositTab />}
      {(tab === 'admin' || tab === 'user') && statement && (
        <>
          <StatementFilterRow
            key={`${statement.from}:${statement.to}`}
            value={filters}
            shownFrom={statement.from}
            shownTo={statement.to}
            allowReversals={view === 'admin'}
            onSubmit={(next) => setFilters((current) => ({ ...current, ...next }))}
          />
          <StatementTable statement={statement} access={access} onAction={(action, row) => setPending({ action, row })} />
          <StatementFooter
            unitId={unitId}
            filters={effective}
            documentRows={statement.rows.length}
            canWrite={access.canWrite}
            closeHref={closeHref}
          />
        </>
      )}
      {query.error !== null && !statement && (
        <p className="text-sm text-destructive">
          Could not load the statement.{' '}
          <Button type="button" variant="link" className="px-1" onClick={() => void query.refetch()}>
            Retry
          </Button>
        </p>
      )}
      <ActionDialog pending={pending} onClose={() => setPending(null)} />
    </div>
  );
}
