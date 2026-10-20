import type { ReactNode } from 'react';
import { formatCurrency } from '@/lib/utils';
import { ActionLink, CardState, DASH, DashCard, type BandProps } from './card-parts';
import { DASHBOARD_ROUTES } from './routes';

function money(value: string | null | undefined): string {
  return value == null ? DASH : formatCurrency(value);
}

export function ExpenseCard({ status, summary }: BandProps): ReactNode {
  const expense = summary?.expense;
  return (
    <DashCard title="Expense Tracker">
      <CardState status={status}>
        <p>{`Expenses: ${money(expense?.total)}`}</p>
        {/* DASH-12 — budget minus booked; hidden while no budget is set (null). */}
        {expense?.variance != null && (
          <p className={Number(expense.variance) < 0 ? 'text-destructive' : undefined}>{`Variance Amount: ${money(expense.variance)}`}</p>
        )}
        {expense && (
          <ActionLink href={DASHBOARD_ROUTES.purchases}>
            {expense.open_purchase_requests} Open Purchase Requests
          </ActionLink>
        )}
      </CardState>
    </DashCard>
  );
}

export function BankCard({ status, summary }: BandProps): ReactNode {
  const bank = summary?.bank;
  return (
    <DashCard title="Bank & Cash" href={DASHBOARD_ROUTES.bank}>
      <CardState status={status}>
        <p className="font-medium">{`Total: ${money(bank?.total)}`}</p>
        {bank && (
          <ul className="space-y-1 text-muted-foreground">
            {bank.accounts.map((account) => (
              <li key={account.id}>{`${account.name} — ${formatCurrency(account.balance)}`}</li>
            ))}
            {bank.more > 0 && <li>{`+${bank.more} more`}</li>}
          </ul>
        )}
      </CardState>
    </DashCard>
  );
}

export function LedgerCard({ status }: BandProps): ReactNode {
  return (
    <DashCard title="General Ledger">
      <CardState status={status}>
        <div className="flex flex-wrap gap-2">
          <ActionLink href={DASHBOARD_ROUTES.trialBalance}>Trial Balance</ActionLink>
          <ActionLink href={DASHBOARD_ROUTES.financialStatements}>Financial Statements</ActionLink>
        </div>
      </CardState>
    </DashCard>
  );
}

export function UtilityCard({ status, summary }: BandProps): ReactNode {
  const utility = summary?.utility;
  return (
    <DashCard title="Utility Tracker" href={DASHBOARD_ROUTES.utilities}>
      <CardState status={status}>
        <p>{`${utility ? utility.pending_bills : DASH} bills pending`}</p>
        <p>{`Billed: ${money(utility?.billed_amount)}`}</p>
      </CardState>
    </DashCard>
  );
}
