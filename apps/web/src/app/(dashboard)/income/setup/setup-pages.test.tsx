import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AutoInvoicingSetupPage from './auto-invoicing/page';
import DefaultersSetupPage from './defaulters/page';
import { remindersSentence } from './defaulters/reminders-summary';

const TENANT = '11111111-1111-4111-8111-111111111111';

const mocks = vi.hoisted(() => ({
  layout: 'classic' as 'classic' | 'standard',
  mutate: vi.fn(),
  settings: {} as Record<string, unknown>,
  ruleLinesOn: false,
}));

vi.mock('@/lib/layout-context', () => ({ useAdminLayout: () => mocks.layout }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('@/hooks/use-tenants', () => ({
  useTenant: () => ({ data: { id: TENANT, settings_json: mocks.settings } }),
  useTenantSettings: () => ({ mutate: mocks.mutate, isPending: false }),
}));
// Each card has its own tests; here only that the page holds them.
vi.mock('../../settings/billing-rules-card', () => ({ BillingRulesCard: () => <section>Billing rules card</section> }));
vi.mock('../../settings/interest-card', () => ({ InterestCard: () => <section>Interest card</section> }));
vi.mock('../../invoices/billing-runs-panel', () => ({ BillingRunsPanel: () => <section>Billing runs panel</section> }));
vi.mock('./auto-invoicing/components/auto-invoice-form', () => ({ AutoInvoiceForm: () => <section>Auto invoicing form</section> }));
vi.mock('./auto-invoicing/components/rule-book', () => ({ RuleBook: () => <section>Rules per unit type</section> }));
vi.mock('@/hooks/use-billing-rules', () => ({
  useAutoInvoiceSettings: () => ({ data: { billing_auto_invoice: { enabled: mocks.ruleLinesOn } } }),
}));

function signIn(role: string): void {
  localStorage.setItem('communityos_tenant', TENANT);
  localStorage.setItem(
    'communityos_user',
    JSON.stringify({
      id: 'user-1',
      name: 'Test User',
      phone: '+910000000010',
      isSuperAdmin: false,
      role,
      societies: [{ id: TENANT, name: 'Test Society', role }],
    }),
  );
}

beforeEach(() => {
  mocks.layout = 'classic';
  mocks.settings = {};
  mocks.ruleLinesOn = false;
});

afterEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('Income Tracker › Setup › Auto Invoicing', () => {
  it('holds the auto-invoicing form, the rule lines, interest, the billing runs and the old rules', () => {
    signIn('community_admin');
    render(<AutoInvoicingSetupPage />);

    expect(screen.getByText('Auto invoicing form')).toBeTruthy();
    expect(screen.getByText('Rules per unit type')).toBeTruthy();
    expect(screen.getByText('Billing rules card')).toBeTruthy();
    expect(screen.getByText('Interest card')).toBeTruthy();
    expect(screen.getByText('Billing runs panel')).toBeTruthy();
  });

  it('drops the old billing rules once auto-invoicing from rule lines is on (INC-17)', () => {
    signIn('accountant');
    mocks.ruleLinesOn = true;
    render(<AutoInvoicingSetupPage />);

    expect(screen.queryByText('Billing rules card')).toBeNull();
    expect(screen.getByText('Rules per unit type')).toBeTruthy();
  });

  it('leaves the title to the classic frame, and draws its own header in standard', () => {
    signIn('community_admin');
    const { unmount } = render(<AutoInvoicingSetupPage />);
    expect(screen.queryByRole('heading', { name: 'Auto Invoicing' })).toBeNull();
    unmount();

    mocks.layout = 'standard';
    render(<AutoInvoicingSetupPage />);
    expect(screen.getByRole('heading', { name: 'Auto Invoicing' })).toBeTruthy();
  });
});

describe('Income Tracker › Setup › Defaulters', () => {
  it('lets the community admin switch automatic reminders on and pick the days', () => {
    signIn('community_admin');
    render(<DefaultersSetupPage />);

    fireEvent.click(screen.getByRole('switch'));
    fireEvent.change(screen.getByLabelText('Reminder day 1'), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save reminders' }));

    expect(mocks.mutate).toHaveBeenCalledWith(
      { tenant_id: TENANT, settings: { billing_reminders: { enabled: true, days: [5] } } },
      expect.any(Object),
    );
    expect(screen.queryByRole('note')).toBeNull();
  });

  it('shows an accountant what is set, without the controls', () => {
    signIn('accountant');
    mocks.settings = { billing_reminders: { enabled: true, days: [20, 5] } };
    render(<DefaultersSetupPage />);

    expect(screen.queryByRole('switch')).toBeNull();
    expect(screen.getByRole('note').textContent).toMatch(/Only the society's community admin/);
    expect(screen.getByText('Automatic reminders go out at 09:00 IST on the 5th, 20th of each month.')).toBeTruthy();
  });
});

describe('remindersSentence', () => {
  it('reads off when never saved, switched off, or on with no day', () => {
    expect(remindersSentence(undefined)).toBe('Automatic reminders are off.');
    expect(remindersSentence({ enabled: false, days: [5] })).toBe('Automatic reminders are off.');
    expect(remindersSentence({ enabled: true, days: [] })).toBe('Automatic reminders are off.');
  });
});
