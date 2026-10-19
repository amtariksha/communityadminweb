import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BillingEmailFilters, BillingEmailRow } from '@/hooks/use-billing-email';
import { EmailStatusContent } from './email-status-content';

const TENANT = '11111111-1111-4111-8111-111111111111';
const mocks = vi.hoisted(() => ({
  filters: [] as BillingEmailFilters[],
  rows: [] as BillingEmailRow[],
  resend: vi.fn(),
}));

vi.mock('@/lib/layout-context', () => ({ useAdminLayout: () => 'classic' }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('@/hooks/use-billing-email', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/use-billing-email')>()),
  useBillingEmailLog: (filters: BillingEmailFilters) => {
    mocks.filters.push(filters);
    return { data: { data: mocks.rows, total: mocks.rows.length }, isLoading: false, error: null, refetch: vi.fn() };
  },
  useResendBillingEmail: () => ({ mutateAsync: mocks.resend, isPending: false }),
}));

const row = (id: string, status: BillingEmailRow['status'], notes: string | null = null): BillingEmailRow => ({
  id, name: `Owner ${id}`, unit_label: `A-${id}`, email: `owner${id}@example.com`, subject: `Maintenance Charges Invoice INV-${id} – Nov 2026`,
  sent_date: '2026-11-01T05:00:00Z', status, notes, document_type: 'invoice', document_id: `d${id}`,
});

function signIn(role: string): void {
  localStorage.setItem('communityos_tenant', TENANT);
  localStorage.setItem('communityos_user', JSON.stringify({ id: 'me', name: 'Me', phone: '+910000000010', isSuperAdmin: false, role, societies: [{ id: TENANT, name: 'Green Acres', role }] }));
}

beforeEach(() => {
  mocks.rows = [row('101', 'sent'), row('102', 'failed', 'transport_disabled')];
  mocks.filters = [];
  signIn('accountant');
});
afterEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('Email Status Monitor (INC-31)', () => {
  it('lists Name · Unit No · Email ID · Subject · Sent Date · Email Status · Notes', () => {
    render(<EmailStatusContent />);
    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('columnheader').map((h) => h.textContent)).toEqual([
      'S.No', 'Name', 'Unit No', 'Email ID', 'Subject', 'Sent Date', 'Email Status', 'Notes', 'E-mail again',
    ]);
    expect(table.textContent).toContain('E-mail is not configured on the server');
  });

  it('fetches by e-mail, subject and sent dates', () => {
    render(<EmailStatusContent />);
    fireEvent.change(screen.getByLabelText('Email ID'), { target: { value: 'owner101' } });
    fireEvent.change(screen.getByLabelText('Sent Date: From'), { target: { value: '2026-11-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Fetch' }));
    expect(mocks.filters.at(-1)).toMatchObject({ email: 'owner101', from: '2026-11-01', page: 1 });
  });

  it('offers E-mail again on failed rows only', async () => {
    mocks.resend.mockResolvedValue({ status: 'sent', error: null });
    render(<EmailStatusContent />);
    const buttons = screen.getAllByRole('button', { name: 'E-mail again' });
    expect(buttons).toHaveLength(1);
    fireEvent.click(buttons[0]);
    await vi.waitFor(() => expect(mocks.resend).toHaveBeenCalledWith('102'));
  });
});
