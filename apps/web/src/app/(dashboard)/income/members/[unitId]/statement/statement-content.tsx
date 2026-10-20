'use client';

import { type ReactNode } from 'react';
import { useUnitStatement, type UnitStatement } from '@/hooks/use-unit-statement';
import { formatCurrency } from '@/lib/utils';
import { MEMBER_INCOME_BASE } from '../../member-row-actions';
import type { StatementTab } from './statement-actions';
import { StatementScreen, useStatementState } from './statement-screen';
import { CurrentAdvancesTab, CurrentDueTab, RefundableDepositTab } from './summary-tabs';

const figure = (value: number | undefined): string => (value === undefined ? '' : ` (${formatCurrency(value)})`);

function tabLabels(statement: UnitStatement | undefined): ReadonlyArray<[StatementTab, string]> {
  return [
    ['due', `Current Due${figure(statement?.summary.current_due)}`],
    ['advances', `Current Advances${figure(statement?.summary.current_advances)}`],
    ['deposit', `Refundable Deposit${figure(statement?.summary.refundable_deposit)}`],
    ['admin', "Admin's Account Statement"],
    ['user', "User's Account Statement"],
  ];
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
  const state = useStatementState(scope);
  const query = useUnitStatement(unitId, state.effective);
  const summaryTab =
    state.tab === 'due' ? (
      <CurrentDueTab unitId={unitId} scope={state.filters.scope} />
    ) : state.tab === 'advances' ? (
      <CurrentAdvancesTab unitId={unitId} />
    ) : (
      <RefundableDepositTab />
    );
  return (
    <StatementScreen
      party={{ kind: 'unit', id: unitId }}
      state={state}
      query={query}
      labels={tabLabels(query.data)}
      summaryTab={summaryTab}
      closeHref={closeHref}
    />
  );
}
