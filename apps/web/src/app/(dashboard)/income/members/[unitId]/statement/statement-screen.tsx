'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useFinanceAccess } from '@/hooks/use-finance-access';
import type { UnitLedgerScope } from '@/hooks/use-unit-ledger';
import type { StatementAction, StatementFilters, StatementParty, StatementRow, UnitStatement } from '@/hooks/use-unit-statement';
import { isRouteMissing } from '@/lib/not-deployed';
import { cn } from '@/lib/utils';
import { AllocationDialog } from './allocation-dialog';
import { EditDetailsDialog } from './edit-details-dialog';
import { ReverseDialog } from './reverse-dialog';
import { tabFrom, unitLabel, type StatementTab } from './statement-actions';
import { StatementFilterRow } from './statement-filters';
import { StatementFooter } from './statement-footer';
import { StatementTable } from './statement-table';

/**
 * The account statement screen (INC-S17) of a unit (INC-22) or of a
 * non-member payer (INC-46): tabs with their figures, From / To / Show
 * Reversals, the rows with their Actions, and the footer buttons.
 */
export interface StatementState {
  pathname: string;
  tab: StatementTab;
  filters: StatementFilters;
  setFilters: (update: (current: StatementFilters) => StatementFilters) => void;
  /** What the server is asked for: the tab's view, reversals only on the admin view. */
  effective: StatementFilters;
}

export function useStatementState(scope: UnitLedgerScope, tabs?: readonly StatementTab[]): StatementState {
  const pathname = usePathname();
  const tab = tabFrom(useSearchParams().get('tab'), tabs);
  const [filters, setFilters] = useState<StatementFilters>({ from: '', to: '', showReversals: false, scope, view: 'admin' });
  const view = tab === 'user' ? 'resident' : 'admin';
  const effective: StatementFilters = { ...filters, view, showReversals: view === 'admin' && filters.showReversals };
  return { pathname, tab, filters, setFilters, effective };
}

interface PendingAction {
  action: StatementAction;
  row: StatementRow;
}

function TabStrip({ active, labels, pathname }: { active: StatementTab; labels: ReadonlyArray<[StatementTab, string]>; pathname: string }): ReactNode {
  return (
    <nav aria-label="Statement tabs" className="flex flex-wrap gap-1 border-b">
      {labels.map(([tab, label]) => (
        <Link
          key={tab}
          href={`${pathname}?tab=${tab}`}
          aria-current={tab === active ? 'page' : undefined}
          className={cn('px-3 py-2 text-sm', tab === active ? 'border-b-2 border-primary font-semibold' : 'text-muted-foreground')}
        >
          {label}
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

/** "A-101" for a unit, the payer's name for a payer. */
export function statementName(statement: UnitStatement): string {
  return statement.payer?.name ?? unitLabel(statement.unit);
}

export interface StatementQueryLike {
  data?: UnitStatement;
  error: unknown;
  refetch: () => unknown;
}

interface StatementScreenProps {
  party: StatementParty;
  state: StatementState;
  query: StatementQueryLike;
  /** The tabs in order with their labels (figures included). */
  labels: ReadonlyArray<[StatementTab, string]>;
  /** What a summary tab (Current Due, Current Advances, Refundable Deposit) shows. */
  summaryTab: ReactNode;
  closeHref: string;
}

export function StatementScreen({ party, state, query, labels, summaryTab, closeHref }: StatementScreenProps): ReactNode {
  const access = useFinanceAccess();
  const [pending, setPending] = useState<PendingAction | null>(null);
  const statement = query.data;
  const statementTab = state.tab === 'admin' || state.tab === 'user';

  if (isRouteMissing(query.error)) {
    return <p className="text-sm text-muted-foreground">The account statement is not available yet on this server.</p>;
  }
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Account Statement for {statement ? statementName(statement) : '…'}</h2>
      <TabStrip active={state.tab} labels={labels} pathname={state.pathname} />
      {!statementTab && summaryTab}
      {statementTab && statement && (
        <>
          <StatementFilterRow
            key={`${statement.from}:${statement.to}`}
            value={state.filters}
            shownFrom={statement.from}
            shownTo={statement.to}
            allowReversals={state.effective.view === 'admin'}
            onSubmit={(next) => state.setFilters((current) => ({ ...current, ...next }))}
          />
          <StatementTable statement={statement} access={access} onAction={(action, row) => setPending({ action, row })} />
          <StatementFooter party={party} statement={statement} filters={state.effective} canWrite={access.canWrite} closeHref={closeHref} />
        </>
      )}
      {query.error !== null && query.error !== undefined && !statement && (
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
