import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api-error';
import { ByDateContent, entryPdfPath } from './by-date-content';

/** INC-46 — Non Member Income › By Date: Fetch a period, rows with PDF, not available on an older API. */

const mocks = vi.hoisted(() => ({
  ranges: [] as unknown[],
  result: { data: undefined as unknown, isLoading: false, isFetching: false, error: null as unknown, refetch: vi.fn() },
}));

vi.mock('@/hooks/use-payer-ledger', () => ({
  useNonMemberByDate: (range: unknown) => {
    mocks.ranges.push(range);
    return mocks.result;
  },
}));
vi.mock('@/components/income-registers/register-actions', () => ({ PdfButton: ({ path }: { path: string }) => <span>pdf:{path}</span> }));

const ENTRIES = [
  { type: 'invoice', id: 'i-1', date: '2026-10-02', number: 'NM-0001', payer: 'Sunrise Events', account: 'Hall Hire', amount: '11800.00' },
  { type: 'receipt', id: 'r-1', date: '2026-10-05', number: 'NMR-0001', payer: 'Sunrise Events', account: 'Bank Account', amount: '11800.00' },
  { type: 'direct_income', id: 'r-2', date: '2026-10-06', number: 'RCT-0009', payer: null, account: 'Scrap Sale', amount: '750.00' },
];

describe('Non Member Income by date', () => {
  beforeEach(() => {
    mocks.ranges = [];
    mocks.result = { data: undefined, isLoading: false, isFetching: false, error: null, refetch: vi.fn() };
  });

  it('opens empty and fetches the period chosen', () => {
    render(<ByDateContent />);
    expect(screen.getByText('Choose a From and To date and press Fetch.')).toBeTruthy();
    expect(mocks.ranges[mocks.ranges.length - 1]).toBeNull();

    fireEvent.change(screen.getByLabelText('Date Range from'), { target: { value: '2026-10-01' } });
    fireEvent.change(screen.getByLabelText('Date Range to'), { target: { value: '2026-10-31' } });
    fireEvent.click(screen.getByRole('button', { name: 'Fetch' }));

    expect(mocks.ranges[mocks.ranges.length - 1]).toEqual({ from: '2026-10-01', to: '2026-10-31' });
  });

  it('lists the entries with their type and PDF', () => {
    mocks.result = { ...mocks.result, data: { data: ENTRIES, total: 3 } };
    render(<ByDateContent />);
    fireEvent.change(screen.getByLabelText('Date Range from'), { target: { value: '2026-10-01' } });
    fireEvent.change(screen.getByLabelText('Date Range to'), { target: { value: '2026-10-31' } });
    fireEvent.click(screen.getByRole('button', { name: 'Fetch' }));

    expect(screen.getByText('Direct income')).toBeTruthy();
    expect(screen.getByText('pdf:/invoices/i-1/pdf')).toBeTruthy();
    expect(screen.getByText('pdf:/receipts/r-2/pdf')).toBeTruthy();
  });

  it('opens each document type at its PDF route', () => {
    expect(entryPdfPath({ type: 'credit_note', id: 'n-1' })).toBe('/receipts/credit-notes/n-1/pdf');
    expect(entryPdfPath({ type: 'receipt', id: 'r-1' })).toBe('/receipts/r-1/pdf');
  });

  it('says it is not available yet when the route is missing', () => {
    mocks.result = { ...mocks.result, error: new ApiError(404, { statusCode: 404, message: 'Cannot GET' } as never) };
    render(<ByDateContent />);

    expect(screen.getByText('Non Member Income by date is not available yet on this server.')).toBeTruthy();
  });
});
