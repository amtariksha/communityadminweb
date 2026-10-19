import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PurchaseRequestSetup } from './purchase-request-setup';
import { thresholdError } from './threshold-field';

/** EXP-S2 — the grid, the empty-grid notice and the auto-approve limit (pr_approval_threshold). */

const mocks = vi.hoisted(() => ({ configured: false, saveSettings: vi.fn(), canEdit: true }));

vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('@/lib/layout-context', () => ({ useAdminLayout: () => 'classic' }));
vi.mock('@/lib/auth', () => ({ getCurrentTenant: () => 't-1' }));
vi.mock('../../../settings/settings-access', () => ({ canChangeSettings: () => mocks.canEdit }));
vi.mock('@/components/approver-grid', () => ({ ApproverGridEditor: () => <div>grid</div> }));
vi.mock('@/hooks/use-approver-grid', () => ({
  useApproverGrid: () => ({ data: { configured: mocks.configured, people: [], levels: [] } }),
}));
vi.mock('@/hooks/use-tenants', () => ({
  useTenant: () => ({ data: { settings_json: { pr_approval_threshold: 5000 } } }),
  useTenantSettings: () => ({ mutate: mocks.saveSettings, isPending: false }),
}));

afterEach(() => vi.clearAllMocks());

describe('Setup › Purchase Request', () => {
  it('says requests follow the old settings while nobody is at a level', () => {
    mocks.configured = false;
    render(<PurchaseRequestSetup />);
    expect(screen.getByText(/Nobody is at a level yet/)).toBeTruthy();
  });

  it('saves the auto-approve limit as pr_approval_threshold', () => {
    mocks.configured = true;
    render(<PurchaseRequestSetup />);
    expect(screen.queryByText(/Nobody is at a level yet/)).toBeNull();

    const field = screen.getByLabelText('Auto-approve requests up to (₹)') as HTMLInputElement;
    expect(field.value).toBe('5000');
    fireEvent.change(field, { target: { value: '7500' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(mocks.saveSettings.mock.calls[0][0]).toEqual({ tenant_id: 't-1', settings: { pr_approval_threshold: 7500 } });
  });

  it('checks the typed limit', () => {
    expect(thresholdError('-1')).toBe('Enter an amount of 0 or more.');
    expect(thresholdError('10.005')).toBe('At most two decimals.');
    expect(thresholdError('0')).toBeNull();
    expect(thresholdError('0.29')).toBeNull();
  });
});
