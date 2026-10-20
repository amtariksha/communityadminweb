import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SlabRatesTab } from './slab-rates-tab';

const mocks = vi.hoisted(() => ({ query: {} as Record<string, unknown> }));

vi.mock('@/hooks/use-finance-access', () => ({ useFinanceAccess: () => ({ canRead: true, canWrite: true }) }));
vi.mock('@/hooks/use-meter-rules', () => ({ useMeterRules: () => mocks.query }));
vi.mock('./legacy-slabs-tab', () => ({ LegacySlabsTab: () => <p>Legacy slab list</p> }));
vi.mock('./setup/rules/rule-form', () => ({ MeterRuleForm: () => null }));

const rule = {
  id: 'r1', meter_type: 'water', ledger_account_id: 'a1', ledger_account_name: 'Water Charges', ledger_account_code: '4100',
  memorize_readings: true, cumulative_slab: false, minimum_charge: '0.00', effective_from: '2026-04-01', effective_to: null,
  revises_rule_id: null, status: 'active', in_use: true,
  slabs: [{ id: 's1', slab_from: '0.00', slab_to: null, rate_per_unit: '5.00' }],
};

describe('Slab Rates tab (UTIL-13)', () => {
  it('shows the meter rules grouped, each with Edit', () => {
    mocks.query = { data: [rule], isLoading: false, error: null };
    render(<SlabRatesTab />);

    expect(screen.getByText('4100 Water Charges — Water')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Edit' })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Add Meter Rule/ })).toBeTruthy();
  });

  it('keeps the old slab list against an API without meter rules', () => {
    mocks.query = { data: undefined, isLoading: false, error: { status: 404 } };
    render(<SlabRatesTab />);

    expect(screen.getByText('Legacy slab list')).toBeTruthy();
  });
});
