'use client';

import { type ReactNode } from 'react';
import { usePayerOpenBills, usePayerStatement } from '@/hooks/use-payer-ledger';
import type { UnitStatement } from '@/hooks/use-unit-statement';
import { isNotDeployed } from '@/lib/not-deployed';
import { formatCurrency } from '@/lib/utils';
import { PAYER_STATEMENT_TABS, type StatementTab } from '../members/[unitId]/statement/statement-actions';
import { StatementScreen, useStatementState } from '../members/[unitId]/statement/statement-screen';
import { DueTable } from '../members/[unitId]/statement/summary-tabs';
import { NON_MEMBER_BASE } from './non-member-routes';

function tabLabels(statement: UnitStatement | undefined): ReadonlyArray<[StatementTab, string]> {
  const due = statement ? ` (${formatCurrency(statement.summary.current_due)})` : '';
  return [
    ['due', `Current Due${due}`],
    ['admin', "Admin's Account Statement"],
    ['user', "Payer's Account Statement"],
  ];
}

/** Current Due: the payer's open invoices, oldest due first. */
function PayerDueTab({ customerId }: { customerId: string }): ReactNode {
  const bills = usePayerOpenBills(customerId);
  if (isNotDeployed(bills.error)) return <p className="text-sm text-muted-foreground">Open invoices are not available yet on this server.</p>;
  return <DueTable rows={bills.data ?? []} loading={bills.isLoading} emptyText="This payer has no open invoices." />;
}

/**
 * Non Member Income › a payer's account statement (INC-S30 View, INC-46):
 * the unit statement's screen over the payer's invoices, collections and
 * credit notes (always all of the non-member ledger).
 */
export function PayerStatementContent({ customerId }: { customerId: string }): ReactNode {
  const state = useStatementState('all', PAYER_STATEMENT_TABS);
  const query = usePayerStatement(customerId, state.effective);
  return (
    <StatementScreen
      party={{ kind: 'payer', id: customerId }}
      state={state}
      query={query}
      labels={tabLabels(query.data)}
      summaryTab={<PayerDueTab customerId={customerId} />}
      closeHref={NON_MEMBER_BASE}
    />
  );
}
