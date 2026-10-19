import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DefaulterFilters, DefaulterRow } from '@/hooks/use-defaulters';
import { DEFAULT_UTILITY_REMINDER } from '@/app/(dashboard)/income/defaulters/reminder-template';
import { UtilityDefaultersContent } from './utility-defaulters-content';

const TENANT = '11111111-1111-4111-8111-111111111111';

const mocks = vi.hoisted(() => ({
  filters: [] as DefaulterFilters[],
  logScopes: [] as unknown[],
  send: vi.fn(),
  settings: undefined as unknown,
}));

vi.mock('next/navigation', () => ({ useSearchParams: () => ({ get: () => null }) }));
vi.mock('@/lib/layout-context', () => ({ useAdminLayout: () => 'classic' }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('@/hooks/use-tenants', () => ({ useTenant: () => ({ data: { id: TENANT, name: 'Green Acres', settings_json: {} } }) }));
vi.mock('@/hooks/use-ledger', () => ({ useLedgerAccounts: () => ({ data: { data: [] } }) }));
vi.mock('@/hooks/use-unit-billing-categories', () => ({ useUnitBillingCategories: () => ({ data: { data: [] } }) }));
vi.mock('@/hooks/use-finance-access', () => ({ useFinanceAccess: () => ({ canRead: true, canWrite: true }) }));
vi.mock('@/hooks/use-utility-settings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/use-utility-settings')>()),
  useUtilitySettings: () => ({ data: mocks.settings, isLoading: false }),
  useSaveUtilityBilling: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock('@/hooks/use-defaulters', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/use-defaulters')>()),
  useDefaulterList: (filters: DefaulterFilters) => {
    mocks.filters.push(filters);
    const rows: DefaulterRow[] = [
      { unit_id: 'u-1', unit_number: 'U-1', block: 'A', total_due: '600.00', invoice_count: 1, oldest_due_date: '2026-09-11', days_overdue: 30 },
    ];
    return { data: rows, isLoading: false, error: null, refetch: vi.fn() };
  },
  useSendReminders: () => ({ mutateAsync: mocks.send, isPending: false }),
  useReminderLog: (_from: string, _to: string, _page: number, scope: unknown) => {
    mocks.logScopes.push(scope);
    return { data: { data: [], total: 0 }, isLoading: false, isError: false };
  },
}));

function signIn(role: string): void {
  localStorage.setItem('communityos_tenant', TENANT);
  localStorage.setItem('communityos_user', JSON.stringify({ id: 'me', name: 'Me', phone: '+910000000010', isSuperAdmin: false, role, societies: [{ id: TENANT, name: 'Green Acres', role }] }));
}

const view = (reminderTemplate: unknown) => ({
  utility_interest: { rate_pa: 12, due_days: 92, basis: 'due_date', start_date: null },
  utility_interest_inherited: false,
  maintenance_interest: { rate_pa: 18, due_days: 10, basis: 'due_date', start_date: null },
  utility_billing: { auto_post: false, reminder_template: reminderTemplate },
});

beforeEach(() => {
  mocks.filters = [];
  mocks.logScopes = [];
  mocks.settings = view(null);
  signIn('accountant');
});
afterEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('Utility Tracker › Defaulters (UTIL-09)', () => {
  it('lists the utility ledger, its own reminder log and the utility reminder text', () => {
    render(<UtilityDefaultersContent />);

    expect(mocks.filters.at(-1)?.scope).toBe('utility');
    expect(mocks.logScopes.at(-1)).toBe('utility');
    expect(screen.getByText('Utility reminder text')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Setup › Defaulters' }).getAttribute('href')).toBe('/utilities/defaulters#utility-reminder-text');
  });

  it('starts the composer from our utility text and reminds the utility bills only', async () => {
    mocks.send.mockResolvedValue({ batch_id: 'b', units: 1, no_dues: 0, sent: 1, skipped_no_email: 0, failed: 0 });
    render(<UtilityDefaultersContent />);

    expect((screen.getByLabelText('Subject', { selector: '#reminder-subject' }) as HTMLInputElement).value).toBe(DEFAULT_UTILITY_REMINDER.subject);
    fireEvent.click(screen.getByRole('button', { name: 'Select All' }));
    fireEvent.click(screen.getByRole('button', { name: 'Send Email' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes, send' }));
    await vi.waitFor(() => expect(mocks.send).toHaveBeenCalled());
    expect(mocks.send.mock.calls[0][0]).toMatchObject({ unit_ids: ['u-1'], scope: 'utility', subject: DEFAULT_UTILITY_REMINDER.subject });
  });

  it('starts from the saved utility text', () => {
    mocks.settings = view({ subject: 'Water dues {{unit}}', message_html: '<p>Pay</p>', reply_to: null, from_name: 'Desk' });
    render(<UtilityDefaultersContent />);

    expect((screen.getByLabelText('Subject', { selector: '#reminder-subject' }) as HTMLInputElement).value).toBe('Water dues {{unit}}');
  });

  it('does not send through a server that would remind every ledger', () => {
    mocks.settings = { ...view(null), utility_billing: { auto_post: false } };
    render(<UtilityDefaultersContent />);

    expect(screen.getByText('Sending utility reminders is not available yet on this server.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Send Email' })).toBeNull();
  });
});
