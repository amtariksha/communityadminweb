import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { DashboardSummary } from '@/hooks/use-analytics';
import { UtilityCard } from './accounting-cards';
import { IncomeCard } from './income-card';

// DASH-13: "N Paid Intimations" on the Income and Utility cards, opening the INC-65 queue.

vi.mock('recharts', () => {
  const Nothing = (): null => null;
  const Pass = ({ children }: { children: React.ReactNode }) => <>{children}</>;
  return { ResponsiveContainer: Pass, PieChart: Pass, Pie: Nothing, Cell: Nothing };
});

const access = { readsBooks: true, publishes: true, canOpen: () => true };

function summary(income: number | null, utility: number | null | undefined): DashboardSummary {
  return {
    income: { collected: '0.00', outstanding: '0.00', defaulters: 0, paid_intimations: income },
    utility: { pending_bills: 0, billed_amount: '0.00', ...(utility === undefined ? {} : { paid_intimations: utility }) },
  } as DashboardSummary;
}

describe('Paid Intimations on the dashboard cards', () => {
  it('shows "2 Paid Intimations", opening the queue', () => {
    render(<IncomeCard status="ready" summary={summary(2, 1)} access={access} />);
    expect(screen.getByRole('link', { name: '2 Paid Intimations' }).getAttribute('href')).toBe('/income/members/intimations');
  });

  it('opens the utility queue from the Utility card', () => {
    render(<UtilityCard status="ready" summary={summary(2, 1)} access={access} />);
    expect(screen.getByRole('link', { name: '1 Paid Intimations' }).getAttribute('href')).toBe('/income/members/intimations?scope=utility');
  });

  it('shows nothing while the API has no intimations', () => {
    render(<IncomeCard status="ready" summary={summary(null, undefined)} access={access} />);
    render(<UtilityCard status="ready" summary={summary(null, undefined)} access={access} />);
    expect(screen.queryByText(/Paid Intimations/)).toBeNull();
  });
});
