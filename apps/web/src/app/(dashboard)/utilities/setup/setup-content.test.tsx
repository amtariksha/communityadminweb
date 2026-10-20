import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { UtilitySetupContent } from './setup-content';

const mocks = vi.hoisted(() => ({ canWrite: true, save: vi.fn() }));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/lib/layout-context', () => ({ useAdminLayout: () => 'classic' }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('@/hooks/use-finance-access', () => ({ useFinanceAccess: () => ({ canRead: true, canWrite: mocks.canWrite }) }));
vi.mock('@/hooks/use-bank', () => ({
  useBankAccounts: () => ({
    data: [
      { id: 'b1', bank_name: 'Maintenance Bank', account_number: '111', is_primary: true, is_active: true },
      { id: 'b2', bank_name: 'Water Bank', account_number: '222', is_primary: false, is_active: true },
    ],
  }),
}));
vi.mock('@/hooks/use-meter-rules', () => ({
  useMeterRules: () => ({
    isLoading: false,
    error: null,
    data: [
      {
        id: 'r1', meter_type: 'gas', ledger_account_id: 'a1', ledger_account_name: 'Gas Charges', ledger_account_code: null,
        memorize_readings: false, cumulative_slab: true, minimum_charge: '100.00', effective_from: '2026-04-01', effective_to: null,
        revises_rule_id: null, status: 'active', in_use: false,
        slabs: [{ id: 's1', slab_from: '0.00', slab_to: '10.00', rate_per_unit: '5.00' }, { id: 's2', slab_from: '10.00', slab_to: null, rate_per_unit: '7.00' }],
      },
    ],
  }),
}));
vi.mock('@/hooks/use-utility-settings', () => ({
  useUtilitySettings: () => ({
    data: {
      utility_interest: { rate_pa: 12, due_days: 92, basis: 'due_date', start_date: '2026-10-01' },
      utility_interest_inherited: false,
      maintenance_interest: { rate_pa: 18, due_days: 10, basis: 'due_date', start_date: null },
      utility_billing: { auto_post: false, reminder_template: null, excluded_bank_account_ids: ['b1'] },
    },
  }),
  useSaveUtilityBilling: () => ({ mutate: mocks.save, isPending: false }),
}));
vi.mock('@/components/show-logs', () => ({ ShowLogsButton: () => <button type="button">Show Logs</button> }));

afterEach(() => {
  vi.clearAllMocks();
  mocks.canWrite = true;
});

describe('Utility Tracker › Setup (UTIL-10, UTIL-14)', () => {
  it('shows each rule read-only with Edit, the interest rule and no Show Logs', () => {
    render(<UtilitySetupContent />);

    expect(screen.getByText('Gas Charges — Gas')).toBeTruthy();
    expect(screen.getByText(/Memorize Readings : No · Cumulative Slab : Yes/)).toBeTruthy();
    expect(screen.getByText('0 – 10')).toBeTruthy();
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.getByRole('button', { name: 'Edit' })).toBeTruthy();
    expect(screen.getByText('12% pa')).toBeTruthy();
    expect(screen.getByText('92 days')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Show Logs' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Batch Posting' }).getAttribute('href')).toBe('/utilities/bulk-posting');
  });

  it('saves the bank accounts left out of utility payment instructions', () => {
    render(<UtilitySetupContent />);

    expect((screen.getByLabelText(/Maintenance Bank/) as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByLabelText(/Water Bank/));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(mocks.save).toHaveBeenCalledWith({ excluded_bank_account_ids: ['b1', 'b2'] }, expect.anything());
  });

  it('gives a reader no Edit and no Save', () => {
    mocks.canWrite = false;
    render(<UtilitySetupContent />);

    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Add Meter Rule' })).toBeNull();
  });
});
