import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DefaulterFilters, DefaulterRow } from '@/hooks/use-defaulters';
import { DefaultersContent } from './defaulters-content';
import { composerDefaults, DEFAULT_REMINDER } from './reminder-template';

const TENANT = '11111111-1111-4111-8111-111111111111';

const mocks = vi.hoisted(() => ({
  filters: [] as DefaulterFilters[],
  rows: [] as DefaulterRow[],
  send: vi.fn(),
  view: null as string | null,
}));

vi.mock('next/navigation', () => ({ useSearchParams: () => ({ get: () => mocks.view }) }));
vi.mock('@/lib/layout-context', () => ({ useAdminLayout: () => 'standard' }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('@/hooks/use-tenants', () => ({ useTenant: () => ({ data: { id: TENANT, name: 'Green Acres', settings_json: {} } }) }));
vi.mock('@/hooks/use-ledger', () => ({ useLedgerAccounts: () => ({ data: { data: [{ id: 'acc-1', name: 'Maintenance Income' }] } }) }));
vi.mock('@/hooks/use-unit-billing-categories', () => ({ useUnitBillingCategories: () => ({ data: { data: [{ id: 'type-1', name: 'Shop' }] } }) }));
vi.mock('@/hooks/use-defaulters', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/use-defaulters')>()),
  useDefaulterList: (filters: DefaulterFilters) => {
    mocks.filters.push(filters);
    return { data: mocks.rows, isLoading: false, error: null, refetch: vi.fn() };
  },
  useSendReminders: () => ({ mutateAsync: mocks.send, isPending: false }),
}));

const row = (unit: string, due: string, extra: Partial<DefaulterRow> = {}): DefaulterRow => ({
  unit_id: `u-${unit}`, unit_number: unit, block: 'A', total_due: due, invoice_count: 1, oldest_due_date: '2026-09-11',
  days_overdue: 30, type: 'Owner', primary_contact_name: `Owner ${unit}`, bill_to_name: `Owner ${unit}`,
  email: `owner${unit}@example.com`, phone: '+910000000020', ...extra,
});

function signIn(role: string): void {
  localStorage.setItem('communityos_tenant', TENANT);
  localStorage.setItem('communityos_user', JSON.stringify({ id: 'me', name: 'Me', phone: '+910000000010', isSuperAdmin: false, role, societies: [{ id: TENANT, name: 'Green Acres', role }] }));
}

beforeEach(() => {
  mocks.rows = [row('101', '1200.00'), row('102', '3400.00', { phone: null, email: null })];
  mocks.filters = [];
  mocks.view = null;
  signIn('accountant');
});
afterEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('Income Tracker › Defaulters (INC-29)', () => {
  it('lists the defaulters with the nine columns, blank where the society hides contacts', () => {
    render(<DefaultersContent />);
    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('columnheader').map((h) => h.textContent)).toEqual([
      'Sl.No', 'Type', 'Unit', 'Primary Contact', 'Bill to Party Name', 'Email', 'Phone', 'Due', 'Select',
    ]);
    const second = within(table).getAllByRole('row')[2];
    expect(second.textContent).toContain('A-102');
    expect(second.textContent).not.toContain('@example.com');
  });

  it('sends Amount Between and the unit types and accounts ticked', () => {
    render(<DefaultersContent />);
    fireEvent.change(screen.getByLabelText('Amount from'), { target: { value: '1000' } });
    fireEvent.change(screen.getByLabelText('Amount to'), { target: { value: '5000' } });
    fireEvent.click(screen.getByLabelText('Shop'));
    fireEvent.click(screen.getByLabelText('Maintenance Income'));
    fireEvent.click(screen.getByRole('button', { name: 'Apply filters' }));
    expect(mocks.filters.at(-1)).toMatchObject({ view: 'invoices', min_due: '1000', max_due: '5000', category_ids: ['type-1'], account_ids: ['acc-1'] });
  });

  it('opens on Other from the link', () => {
    mocks.view = 'other';
    render(<DefaultersContent />);
    expect(mocks.filters.at(-1)?.view).toBe('other');
  });

  it('selects all and asks before sending the e-mail', async () => {
    mocks.send.mockResolvedValue({ batch_id: 'b', units: 2, no_dues: 0, sent: 2, skipped_no_email: 0, failed: 0 });
    render(<DefaultersContent />);
    fireEvent.click(screen.getByRole('button', { name: 'Send Email' }));
    expect(screen.getByRole('alert').textContent).toBe('Select at least one unit.');

    fireEvent.click(screen.getByRole('button', { name: 'Select All' }));
    fireEvent.click(screen.getByRole('button', { name: 'Send Email' }));
    expect(mocks.send).not.toHaveBeenCalled();
    expect(screen.getByText('Send this e-mail to 2 unit(s)?')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Yes, send' }));
    await vi.waitFor(() => expect(mocks.send).toHaveBeenCalled());
    expect(mocks.send.mock.calls[0][0]).toMatchObject({ unit_ids: ['u-101', 'u-102'], channel: 'email', subject: DEFAULT_REMINDER.subject, from_name: 'Green Acres' });
  });

  it('cannot pick SMS, and a reader cannot send', () => {
    signIn('committee_member');
    render(<DefaultersContent />);
    expect((screen.getByLabelText(/SMS/) as HTMLInputElement).disabled).toBe(true);
    expect(screen.queryByRole('button', { name: 'Send Email' })).toBeNull();
  });

  it('starts the composer from a saved template', () => {
    expect(composerDefaults({ subject: 'Saved', reply_to: 'tr@example.com' }, 'Green Acres')).toEqual({
      reply_to: 'tr@example.com', from_name: 'Green Acres', subject: 'Saved', message_html: DEFAULT_REMINDER.message_html,
    });
  });
});
