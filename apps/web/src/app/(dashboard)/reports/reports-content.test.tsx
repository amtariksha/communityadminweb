import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ReportsContent from './reports-content';

const mocks = vi.hoisted(() => ({ report: 'income-expenditure' }));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(`report=${mocks.report}`),
}));
vi.mock('@/components/ledger-reports', () => ({
  IncomeExpenditureView: ({ startDate, endDate }: { startDate: string; endDate: string }) => (
    <p>{`I&E ${startDate} to ${endDate}`}</p>
  ),
  TrialBalanceView: ({ asOfDate }: { asOfDate: string }) => <p>{`TB ${asOfDate}`}</p>,
  BalanceSheetView: ({ asOfDate }: { asOfDate: string }) => <p>{`BS ${asOfDate}`}</p>,
  GeneralLedgerView: () => <p>GL</p>,
  DefaultersView: () => <p>Defaulters</p>,
  VendorAgingView: () => <p>Vendor aging</p>,
}));
vi.mock('@/hooks', () => {
  const empty = () => ({ data: undefined, isLoading: false, isError: false });
  return {
    useTrialBalance: empty,
    useBalanceSheet: empty,
    useGeneralLedgerReport: empty,
    useDefaulters: empty,
    useVendorAging: empty,
    useLedgerAccounts: () => ({ data: { data: [] }, isLoading: false }),
  };
});

beforeEach(() => {
  // 14 Oct 2026, 11:30 in India.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-14T06:00:00Z'));
});
afterEach(() => {
  vi.useRealTimers();
});

const valueOf = (label: string): string => (screen.getByLabelText(label) as HTMLInputElement).value;

describe('ReportsContent dates (REP-02)', () => {
  it('opens a range report on the current financial year', () => {
    mocks.report = 'income-expenditure';
    render(<ReportsContent />);

    expect(valueOf('Start Date')).toBe('2026-04-01');
    expect(valueOf('End Date')).toBe('2027-03-31');
    expect(screen.getByText('I&E 2026-04-01 to 2027-03-31')).toBeTruthy();
  });

  it('Full Year returns to the current financial year after the range was changed', () => {
    mocks.report = 'income-expenditure';
    render(<ReportsContent />);

    fireEvent.change(screen.getByLabelText('Start Date'), { target: { value: '2025-04-01' } });
    fireEvent.click(screen.getByRole('button', { name: /Full Year/ }));

    expect(valueOf('Start Date')).toBe('2026-04-01');
    expect(valueOf('End Date')).toBe('2027-03-31');
  });

  it('Year End sets the end of the current financial year; Today sets today', () => {
    mocks.report = 'trial-balance';
    render(<ReportsContent />);

    expect(valueOf('As of Date')).toBe('2026-10-14');
    fireEvent.click(screen.getByRole('button', { name: /Year End/ }));
    expect(valueOf('As of Date')).toBe('2027-03-31');
    fireEvent.click(screen.getByRole('button', { name: 'Today' }));
    expect(valueOf('As of Date')).toBe('2026-10-14');
  });
});
