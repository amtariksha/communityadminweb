import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FinancialYear } from '@communityos/shared';
import { FinancialYearsCard } from './financial-years-card';
import { FREEZE_ONLY_TEXT, FreezeYearDialog, YEAR_END_TEXT, yearEndSummary } from './financial-year-dialogs';

const mocks = vi.hoisted(() => ({
  addToast: vi.fn(),
  closeYear: vi.fn(),
  freezeYear: vi.fn(),
  mayChangeSettings: true,
  years: [] as unknown[],
  saveStart: vi.fn(),
  ledgerSettings: { accounting_start_date: null, earliest_financial_year_start: '2025-04-01', earliest_entry_date: null } as unknown,
}));

vi.mock('@/hooks/use-ledger-settings', () => ({
  useLedgerSettings: () => ({ data: mocks.ledgerSettings, isLoading: false }),
  useSaveAccountingStartDate: () => ({ mutate: mocks.saveStart, isPending: false }),
}));

vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: mocks.addToast }) }));
vi.mock('./settings-access', () => ({ canChangeSettings: () => mocks.mayChangeSettings }));
vi.mock('@/hooks', () => ({
  useFinancialYears: () => ({ data: mocks.years, isLoading: false }),
  useSetCurrentYear: () => ({ mutate: vi.fn(), isPending: false }),
  useUnfreezeYear: () => ({ mutate: vi.fn(), isPending: false }),
  useCreateFinancialYear: () => ({ mutate: vi.fn(), isPending: false }),
  useFreezeYear: () => ({ mutate: mocks.freezeYear, isPending: false }),
  useCloseFinancialYear: () => ({ mutate: mocks.closeYear, isPending: false }),
}));

function year(overrides: Partial<FinancialYear>): FinancialYear {
  return {
    id: 'fy-1',
    tenant_id: 't-1',
    label: 'FY 2026-27',
    start_date: '2026-04-01' as unknown as Date,
    end_date: '2027-03-31' as unknown as Date,
    is_current: true,
    is_frozen: false,
    ...overrides,
  };
}

const OPEN = year({});
const FROZEN = year({ id: 'fy-0', label: 'FY 2025-26', is_current: false, is_frozen: true });

beforeEach(() => {
  mocks.mayChangeSettings = true;
  mocks.years = [OPEN, FROZEN];
  mocks.ledgerSettings = { accounting_start_date: null, earliest_financial_year_start: '2025-04-01', earliest_entry_date: null };
});
afterEach(() => vi.clearAllMocks());

const rowOf = (label: string): HTMLElement => screen.getByText(label).closest('.rounded-md') as HTMLElement;

describe('FinancialYearsCard — Perform Year End (GL-06)', () => {
  it('is offered to a community admin and disabled on a frozen year', () => {
    render(<FinancialYearsCard />);

    const open = within(rowOf('FY 2026-27')).getByRole('button', { name: 'Perform Year End' }) as HTMLButtonElement;
    const frozen = within(rowOf('FY 2025-26')).getByRole('button', { name: 'Perform Year End' }) as HTMLButtonElement;
    expect(open.disabled).toBe(false);
    expect(frozen.disabled).toBe(true);
  });

  it('is not shown to a role that may not close the year', () => {
    mocks.mayChangeSettings = false;
    render(<FinancialYearsCard />);

    expect(screen.queryByRole('button', { name: 'Perform Year End' })).toBeNull();
  });

  it('says what it does, then closes and freezes the year and reports the surplus', () => {
    mocks.closeYear.mockImplementation((_input, options) => {
      options.onSuccess({
        data: { financial_year: { ...OPEN, is_frozen: true }, closing_entry_id: 'je-1', entry_number: 42, surplus: 7000 },
      });
    });
    render(<FinancialYearsCard />);

    fireEvent.click(within(rowOf('FY 2026-27')).getByRole('button', { name: 'Perform Year End' }));
    expect(screen.getByText(YEAR_END_TEXT)).toBeTruthy();
    const dialog = screen.getByText('Perform Year End for FY 2026-27?').closest('dialog') as HTMLElement;
    fireEvent.click(within(dialog).getByRole('button', { name: 'Perform Year End' }));

    expect(mocks.closeYear).toHaveBeenCalledWith({ id: 'fy-1', freeze: true }, expect.anything());
    expect(mocks.addToast).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'Surplus ₹7,000 moved to Retained Earnings (Current) in entry #42.' }),
    );
  });
});

describe('FreezeYearDialog', () => {
  it('says freezing does not pass the retained-earnings entry', () => {
    render(<FreezeYearDialog year={year({ is_current: false })} onClose={vi.fn()} />);

    expect(screen.getByText(new RegExp(FREEZE_ONLY_TEXT.slice(0, 40)))).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Freeze Year' }));
    expect(mocks.freezeYear).toHaveBeenCalledWith('fy-1', expect.anything());
  });
});

describe('yearEndSummary', () => {
  it('names a deficit as such, and says when nothing was left to move', () => {
    expect(
      yearEndSummary({ financial_year: OPEN, closing_entry_id: 'je-2', entry_number: 7, surplus: -2500 }),
    ).toBe('Deficit ₹2,500 moved to Retained Earnings (Current) in entry #7.');
    expect(yearEndSummary({ financial_year: OPEN, closing_entry_id: null, entry_number: null, surplus: 0 })).toBe(
      'Nothing was left to move to Retained Earnings (Current).',
    );
  });

  it('works with an API that does not send the entry number yet', () => {
    expect(yearEndSummary({ financial_year: OPEN, closing_entry_id: 'je-3', surplus: 100 })).toBe(
      'Surplus ₹100 moved to Retained Earnings (Current).',
    );
  });
});

describe('FinancialYearsCard — Accounting start date (GL-19)', () => {
  it('lets a community admin set it', () => {
    render(<FinancialYearsCard />);
    const input = screen.getByLabelText('Accounting start date') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '2025-04-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(mocks.saveStart).toHaveBeenCalledWith('2025-04-01', expect.anything());
  });

  it('shows it read-only to anyone else', () => {
    mocks.mayChangeSettings = false;
    mocks.ledgerSettings = { accounting_start_date: '2025-04-01', earliest_financial_year_start: '2025-04-01', earliest_entry_date: null };
    render(<FinancialYearsCard />);
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
    expect(screen.getByText('01 Apr 2025')).toBeTruthy();
  });

  it('says when the server does not have it yet', () => {
    mocks.ledgerSettings = null;
    render(<FinancialYearsCard />);
    expect(screen.getByText(/not available yet/)).toBeTruthy();
  });
});
