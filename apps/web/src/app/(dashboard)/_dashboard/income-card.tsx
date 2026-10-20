import type { ReactNode } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '@/lib/utils';
import { ActionLink, CardState, DASH, DashCard, type BandProps } from './card-parts';
import { DASHBOARD_ROUTES } from './routes';

const COLLECTED_COLOUR = 'var(--color-success)';
const OUTSTANDING_COLOUR = 'var(--color-warning)';

function money(value: string | null | undefined): string {
  return value == null ? DASH : formatCurrency(value);
}

/** Two-part ring: what was collected in the period against what is outstanding today. */
function Donut({ collected, outstanding }: { collected: number; outstanding: number }): ReactNode {
  const empty = collected + outstanding <= 0;
  const slices = empty
    ? [{ name: 'None', value: 1, colour: 'var(--color-muted)' }]
    : [
        { name: 'Collected', value: collected, colour: COLLECTED_COLOUR },
        { name: 'Outstanding', value: outstanding, colour: OUTSTANDING_COLOUR },
      ];
  return (
    <div className="h-24 w-24 shrink-0">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={slices} dataKey="value" nameKey="name" innerRadius={28} outerRadius={44} stroke="none">
            {slices.map((slice) => (
              <Cell key={slice.name} fill={slice.colour} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function IncomeCard({ status, summary }: BandProps): ReactNode {
  const income = summary?.income;
  return (
    <DashCard title="Income Tracker">
      <CardState status={status}>
        <div className="flex items-center gap-3">
          <div className="space-y-1">
            <p>{`Collected: ${money(income?.collected)}`}</p>
            <p>{`Outstanding: ${money(income?.outstanding)}`}</p>
          </div>
          {income && <Donut collected={Number(income.collected ?? 0)} outstanding={Number(income.outstanding)} />}
        </div>
        {income && (
          <div className="flex flex-wrap gap-2">
            {typeof income.paid_intimations === 'number' && (
              <ActionLink href={DASHBOARD_ROUTES.paidIntimations}>{`${income.paid_intimations} Paid Intimations`}</ActionLink>
            )}
            <ActionLink href={DASHBOARD_ROUTES.defaulters}>{income.defaulters} Defaulters</ActionLink>
          </div>
        )}
      </CardState>
    </DashCard>
  );
}
