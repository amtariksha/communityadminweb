import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import UtilityInterestPage from './page';

const mocks = vi.hoisted(() => ({
  addToast: vi.fn(),
  mutate: vi.fn(),
  push: vi.fn(),
  canWrite: true,
  query: {} as Record<string, unknown>,
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: mocks.addToast }) }));
vi.mock('@/components/show-logs', () => ({ ShowLogsButton: () => <button type="button">Show Logs</button> }));
vi.mock('@/lib/layout-context', () => ({ useAdminLayout: () => 'classic' }));
vi.mock('@/hooks/use-finance-access', () => ({ useFinanceAccess: () => ({ canRead: true, canWrite: mocks.canWrite }) }));
vi.mock('@/hooks/use-utility-settings', () => ({
  useUtilitySettings: () => mocks.query,
  useSaveUtilityInterest: () => ({ mutate: mocks.mutate, isPending: false }),
}));

const maintenance = { rate_pa: 18, due_days: 10, basis: 'due_date', start_date: null };

function settings(inherited: boolean, utility = maintenance): void {
  mocks.query = {
    isLoading: false,
    error: null,
    data: { utility_interest: utility, utility_interest_inherited: inherited, maintenance_interest: maintenance },
  };
}

afterEach(() => {
  vi.clearAllMocks();
  mocks.canWrite = true;
});

describe('Utility Tracker › Setup › Simple Interest (UTIL-06)', () => {
  it('says utilities follow maintenance until a rule of their own is saved', () => {
    settings(true);
    render(<UtilityInterestPage />);

    expect(screen.getByText(/Not set for utilities yet/)).toBeTruthy();
    expect((screen.getByLabelText('Simple Interest ( % pa )') as HTMLInputElement).value).toBe('18');
    expect(screen.getByRole('button', { name: 'Show Logs' })).toBeTruthy();
  });

  it('saves the four fields for utilities', () => {
    settings(true);
    render(<UtilityInterestPage />);

    fireEvent.change(screen.getByLabelText('Simple Interest ( % pa )'), { target: { value: '12' } });
    fireEvent.change(screen.getByLabelText('Due Date ( in days )'), { target: { value: '92' } });
    fireEvent.change(screen.getByLabelText('Interest Start Date (optional)'), { target: { value: '2026-10-01' } });
    fireEvent.click(screen.getByLabelText('Invoice Date'));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(mocks.mutate).toHaveBeenCalledWith(
      { rate_pa: 12, due_days: 92, basis: 'invoice_date', start_date: '2026-10-01' },
      expect.anything(),
    );
  });

  it('refuses a rate above 36% without calling the server', () => {
    settings(false, { ...maintenance, rate_pa: 12 });
    render(<UtilityInterestPage />);

    fireEvent.change(screen.getByLabelText('Simple Interest ( % pa )'), { target: { value: '40' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByText('Enter a rate from 0 to 36.')).toBeTruthy();
    expect(mocks.mutate).not.toHaveBeenCalled();
  });

  it('shows a reader the values without letting them save', () => {
    mocks.canWrite = false;
    settings(false, { ...maintenance, rate_pa: 12 });
    render(<UtilityInterestPage />);

    expect((screen.getByLabelText('Simple Interest ( % pa )') as HTMLInputElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(mocks.mutate).not.toHaveBeenCalled();
  });

  it('closes to Utility Tracker › Setup in classic', () => {
    settings(false);
    render(<UtilityInterestPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(mocks.push).toHaveBeenCalledWith('/utilities/setup');
  });

  it('says the screen is not available on an older server', () => {
    mocks.query = { isLoading: false, error: { status: 404 }, data: undefined };
    render(<UtilityInterestPage />);

    expect(screen.getByText(/not available yet/)).toBeTruthy();
  });
});
