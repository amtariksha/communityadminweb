import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AmcCalendarMonth, AmcContractRow } from '@/hooks/use-amc-contracts';
import { AmcCalendar } from './amc-calendar';
import { AmcList } from './amc-list';

/** VEND-12 the AMC calendar and VEND-11 the Active / Expired lists. */

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => <select {...props}>{children}</select>,
}));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('next/link', () => ({ default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a> }));
vi.mock('@/hooks/use-debounced-value', () => ({ useDebouncedValue: <T,>(value: T): T => value }));
vi.mock('@/lib/api', () => ({ api: { download: vi.fn() } }));

const mocks = vi.hoisted(() => ({ calendar: vi.fn(), list: vi.fn() }));
vi.mock('@/hooks/use-amc-contracts', () => ({
  useAmcCalendar: (year: number | null) => mocks.calendar(year),
  useAmcContracts: (filters: unknown) => mocks.list(filters),
  useCloseAmc: () => ({ mutate: vi.fn(), isPending: false }),
}));

const empty = (month: number): AmcCalendarMonth => ({ month, counts: { payment: 0, service: 0, end: 0, total: 0 }, items: [] });
const MONTHS: AmcCalendarMonth[] = Array.from({ length: 12 }, (_, index) => empty(index + 1)).map((month) =>
  month.month === 4
    ? {
        month: 4,
        counts: { payment: 1, service: 0, end: 0, total: 1 },
        items: [{ date: '2026-04-01', contract_id: 'c-1', title: 'Lift AMC', vendor_name: 'Vendor A Lifts', kind: 'payment', amount: '10000.00' }],
      }
    : month,
);

const ROW: AmcContractRow = {
  id: 'c-1', title: 'Lift AMC', vendor_name: 'Vendor A Lifts', vendor_contact: null, contract_number: null, asset_id: null,
  assets: [{ id: 'a-1', name: 'Lift A' }], start_date: '2026-04-01', end_date: '2027-03-31', cost: '40000.00', status: 'active',
  days_until_expiry: 162, payment_frequency: 'quarterly', next_payment_date: '2027-01-01', next_payment_amount: '10000.00',
};

describe('AMC calendar', () => {
  beforeEach(() => {
    mocks.calendar.mockReset().mockReturnValue({ isLoading: false, data: { year: 2026, months: MONTHS } });
  });

  it('shows twelve months with their counts and lists a month when clicked', () => {
    render(<AmcCalendar />);
    expect(screen.getByText('2026 - Calendar')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'APR (1)' }));
    expect(screen.getByText('Payment due')).toBeTruthy();
    expect(screen.getByText('Lift AMC')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'JAN (0)' }));
    expect(screen.getByText('Nothing scheduled in January.')).toBeTruthy();
  });

  it('fetches the year chosen', () => {
    render(<AmcCalendar />);
    fireEvent.change(screen.getByLabelText('Year'), { target: { value: '2030' } });
    fireEvent.click(screen.getByRole('button', { name: 'Fetch' }));
    expect(mocks.calendar).toHaveBeenLastCalledWith(2030);
  });

  it('says so before the API has the calendar', () => {
    mocks.calendar.mockReturnValue({ isLoading: false, error: { status: 404 } });
    render(<AmcCalendar />);
    expect(screen.getByText('The AMC calendar is not available yet.')).toBeTruthy();
  });
});

describe('AMC lists', () => {
  beforeEach(() => {
    mocks.list.mockReset().mockReturnValue({ isLoading: false, data: { data: [ROW], total: 1 } });
  });

  it('lists active contracts with the next payment and Close Contract', () => {
    render(<AmcList view="active" onEdit={vi.fn()} />);
    expect(mocks.list).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'active', page: 1 }));
    expect(screen.getByText('Quarterly')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Close Contract' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Renew' })).toBeNull();
  });

  it('offers Renew on an expired contract not yet renewed, with its status', () => {
    const onRenew = vi.fn();
    mocks.list.mockReturnValue({ isLoading: false, data: { data: [{ ...ROW, status: 'cancelled', effective_status: 'cancelled' }], total: 1 } });
    render(<AmcList view="expired" onEdit={vi.fn()} onRenew={onRenew} />);
    expect(screen.getByText('Closed')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Renew' }));
    expect(onRenew).toHaveBeenCalledWith(expect.objectContaining({ id: 'c-1' }));
    expect(screen.queryByRole('button', { name: 'Close Contract' })).toBeNull();
  });
});
