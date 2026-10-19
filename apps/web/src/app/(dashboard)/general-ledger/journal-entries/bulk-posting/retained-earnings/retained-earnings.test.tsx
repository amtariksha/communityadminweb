import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RetainedEarningsForm } from './retained-earnings-form';

// General Ledger › Bulk Posting › Automatically Pass Retained Earnings (GL-09, GL-S9).

const mocks = vi.hoisted(() => ({
  years: [] as unknown[],
  mutate: vi.fn(),
}));
vi.mock('@/hooks', () => ({
  useFinancialYears: () => ({ data: mocks.years, isLoading: false }),
  useCloseFinancialYear: () => ({ mutate: mocks.mutate, isPending: false }),
}));

const SOCIETY = '11111111-1111-4111-8111-111111111111';
function signIn(role: string): void {
  localStorage.setItem('communityos_tenant', SOCIETY);
  localStorage.setItem(
    'communityos_user',
    JSON.stringify({ id: 'u1', name: 'A', phone: '+910000000010', isSuperAdmin: false, role, societies: [{ id: SOCIETY, name: 'S', role }] }),
  );
}

const OPEN = { id: 'fy-open', label: '2026-27', start_date: '2026-04-01', end_date: '2027-03-31', is_current: true, is_frozen: false };
const FROZEN = { id: 'fy-old', label: '2025-26', start_date: '2025-04-01', end_date: '2026-03-31', is_current: false, is_frozen: true };

beforeEach(() => {
  mocks.years = [OPEN, FROZEN];
  signIn('community_admin');
});
afterEach(() => {
  localStorage.clear();
  mocks.mutate.mockReset();
});

function choose(yearId: string): void {
  fireEvent.change(screen.getByLabelText('Choose Year End Closure Date'), { target: { value: yearId } });
}

describe('Automatically Pass Retained Earnings', () => {
  it('lists the year ends, a frozen year disabled and labelled closed', () => {
    render(<RetainedEarningsForm />);
    const select = screen.getByLabelText('Choose Year End Closure Date') as HTMLSelectElement;
    const options = [...select.options].map((option) => [option.textContent, option.disabled]);
    expect(options).toEqual([
      ['Select…', false],
      ['31 Mar 2027 (2026-27)', false],
      ['31 Mar 2026 (2025-26, closed)', true],
    ]);
  });

  it('passes the entry without freezing the year and shows the entry number', () => {
    mocks.mutate.mockImplementation((_input, options) =>
      options.onSuccess({ data: { closing_entry_id: 'je-1', entry_number: 12, surplus: 7000, financial_year: OPEN } }),
    );
    render(<RetainedEarningsForm />);
    choose('fy-open');
    fireEvent.click(screen.getByRole('button', { name: 'Automatically Pass Retained Earnings' }));

    expect(mocks.mutate).toHaveBeenCalledWith({ id: 'fy-open', freeze: false }, expect.anything());
    expect(screen.getByRole('status').textContent).toBe(
      'Entry #12 posted. Surplus ₹7,000 moved to Retained Earnings (Current).',
    );
  });

  it('says so when there is nothing left to pass', () => {
    mocks.mutate.mockImplementation((_input, options) =>
      options.onSuccess({ data: { closing_entry_id: null, entry_number: null, surplus: 0, financial_year: OPEN } }),
    );
    render(<RetainedEarningsForm />);
    choose('fy-open');
    fireEvent.click(screen.getByRole('button', { name: 'Automatically Pass Retained Earnings' }));

    expect(screen.getByRole('status').textContent).toBe('Nothing to pass — already up to date.');
  });

  it('shows the API message when the pass is refused', () => {
    mocks.mutate.mockImplementation((_input, options) => options.onError(new Error('Financial year is already frozen.')));
    render(<RetainedEarningsForm />);
    choose('fy-open');
    fireEvent.click(screen.getByRole('button', { name: 'Automatically Pass Retained Earnings' }));

    expect(screen.getByRole('alert').textContent).toContain('already frozen');
  });

  it('asks for a financial year first when the society has none', () => {
    mocks.years = [];
    render(<RetainedEarningsForm />);
    expect(screen.getByText(/Set up a financial year first/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Settings › Financial Years' }).getAttribute('href')).toBe('/settings');
  });

  it('is for the community admin only', () => {
    signIn('accountant');
    render(<RetainedEarningsForm />);
    expect(screen.queryByRole('button', { name: 'Automatically Pass Retained Earnings' })).toBeNull();
    expect(screen.getByRole('note').textContent).toContain('community admin');
  });
});
