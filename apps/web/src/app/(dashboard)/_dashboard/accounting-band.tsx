import Link from 'next/link';
import type { ReactNode } from 'react';
import { BankCard, ExpenseCard, LedgerCard, UtilityCard } from './accounting-cards';
import { BandHeading, type BandProps } from './card-parts';
import { FinancialYearSelect } from './fy-selector';
import { IncomeCard } from './income-card';
import { DASHBOARD_ROUTES } from './routes';

/** Each card opens a screen; it is drawn only when the user may open it. */
const CARDS: ReadonlyArray<{ route: string; Card: (props: BandProps) => ReactNode }> = [
  { route: DASHBOARD_ROUTES.invoices, Card: IncomeCard },
  { route: DASHBOARD_ROUTES.purchases, Card: ExpenseCard },
  { route: DASHBOARD_ROUTES.bank, Card: BankCard },
  { route: DASHBOARD_ROUTES.reports, Card: LedgerCard },
  { route: DASHBOARD_ROUTES.utilities, Card: UtilityCard },
];

function PeriodLabel({ summary }: Pick<BandProps, 'summary'>): ReactNode {
  if (!summary) return null;
  // DASH-09: the band's year is chosen here; its figures follow ?fy=.
  if (summary.period) return <FinancialYearSelect period={summary.period} />;
  return (
    <span className="text-sm text-muted-foreground">
      No financial year is set up{' '}
      <Link href={DASHBOARD_ROUTES.settings} className="text-primary hover:underline">
        Settings › Financial Years
      </Link>
    </span>
  );
}

/** Only for the roles that may read the books; the API leaves these figures out for everyone else. */
export function AccountingBand(props: BandProps): ReactNode {
  const { access, summary } = props;
  const cards = CARDS.filter((card) => access.canOpen(card.route));
  if (!access.readsBooks || cards.length === 0) return null;
  return (
    <section aria-label="Accounting" className="space-y-2">
      <div className="flex flex-wrap items-baseline gap-3">
        <BandHeading>ACCOUNTING</BandHeading>
        <PeriodLabel summary={summary} />
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {cards.map(({ route, Card }) => (
          <Card key={route} {...props} />
        ))}
      </div>
    </section>
  );
}
