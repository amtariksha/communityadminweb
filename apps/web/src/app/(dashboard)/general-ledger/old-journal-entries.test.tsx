import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/api';
import { JournalEntriesList } from './journal-entries/journal-entries-list';

// General Ledger › Journal Entries › Old Journal Entries (GL-10, GL-S7).

vi.mock('@/lib/api', () => ({ api: { get: vi.fn(), post: vi.fn(), download: vi.fn() } }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));

const SOCIETY = '11111111-1111-4111-8111-111111111111';
function signIn(role: string): void {
  localStorage.setItem('communityos_tenant', SOCIETY);
  localStorage.setItem(
    'communityos_user',
    JSON.stringify({ id: 'u1', name: 'A', phone: '+910000000010', isSuperAdmin: false, role, societies: [{ id: SOCIETY, name: 'S', role }] }),
  );
}

const base = {
  financial_year_id: 'fy',
  source_id: null,
  posted_by: 'u1',
  created_at: '2026-04-10T05:00:00.000Z',
  is_reversed: false,
  reverses_entry_id: null,
  reverses_entry_number: null,
  reversed_by_entry_id: null,
  reversed_by_entry_number: null,
};
const ROWS = [
  { ...base, id: 'je-3', entry_number: 3, entry_date: '2026-04-12', narration: 'Gate repair', source_type: 'manual', total_debit: '75.00', total_credit: '75.00', posted_by_name: 'Asha Rao' },
  { ...base, id: 'je-2', entry_number: 2, entry_date: '2026-04-11', narration: 'Invoice INV-1', source_type: 'invoice', total_debit: '500.00', total_credit: '500.00', posted_by_name: 'Asha Rao' },
  { ...base, id: 'je-1', entry_number: 1, entry_date: '2026-04-10', narration: 'Lift repair', source_type: 'manual', total_debit: '100.00', total_credit: '100.00', posted_by_name: null, posted_by: null, is_reversed: true, reversed_by_entry_id: 'je-9', reversed_by_entry_number: 9 },
];

const get = vi.mocked(api.get);
const post = vi.mocked(api.post);

beforeEach(() => {
  signIn('accountant');
  get.mockResolvedValue({ data: ROWS, total: 3 });
  post.mockResolvedValue({ data: { ...ROWS[0], id: 'je-10', entry_number: 10, lines: [] } });
});
afterEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

function renderList(mode: 'fetch' | 'live' = 'fetch') {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <JournalEntriesList mode={mode} />
    </QueryClientProvider>,
  );
}

async function fetchApril(): Promise<HTMLElement> {
  fireEvent.change(screen.getByLabelText('Date from'), { target: { value: '2026-04-01' } });
  fireEvent.change(screen.getByLabelText('Date to'), { target: { value: '2026-04-30' } });
  fireEvent.click(screen.getByRole('button', { name: 'Fetch' }));
  const table = screen.getByRole('table', { name: 'Journal Entries' });
  await within(table).findByText('Gate repair');
  return table;
}

describe('Old Journal Entries', () => {
  it('opens empty and reads nothing until Fetch', () => {
    renderList();
    expect(screen.getByText('Choose a date range and press Fetch')).toBeTruthy();
    expect(get).not.toHaveBeenCalled();
  });

  it('fetches the period: serial numbers, totals, poster names, source and status', async () => {
    renderList();
    const table = await fetchApril();

    expect(get).toHaveBeenCalledWith('/ledger/journal-entries', {
      params: { start_date: '2026-04-01', end_date: '2026-04-30', include_reversals: 'false', page: '1', limit: '25' },
    });
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(3);
    expect(within(rows[0]).getAllByRole('cell')[0].textContent).toBe('1');
    expect(rows[0].textContent).toContain('#3');
    expect(rows[0].textContent).toContain('₹75');
    expect(rows[0].textContent).toContain('Asha Rao');
    expect(rows[1].textContent).toContain('Invoice');
    expect(rows[2].textContent).toContain('Reversed (by #9)');
    expect(rows[2].textContent).toContain('System');
  });

  it('offers Reverse only on a manual entry not yet reversed', async () => {
    renderList();
    const table = await fetchApril();
    const rows = within(table).getAllByRole('row').slice(1);

    expect(within(rows[0]).queryByRole('button', { name: 'Reverse' })).toBeTruthy();
    expect(within(rows[1]).queryByRole('button', { name: 'Reverse' })).toBeNull();
    expect(within(rows[2]).queryByRole('button', { name: 'Reverse' })).toBeNull();
    expect(within(rows[0]).getByRole('link', { name: 'View' }).getAttribute('href')).toBe('/general-ledger/journal-entries/je-3');
  });

  it('reverses after the confirm that says what it posts', async () => {
    renderList();
    const table = await fetchApril();
    fireEvent.click(within(within(table).getAllByRole('row')[1]).getByRole('button', { name: 'Reverse' }));

    expect(
      screen.getByText('This posts a new entry dated today that mirrors #3. The original stays in the books.'),
    ).toBeTruthy();
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Reverse' }));
    await waitFor(() => expect(post).toHaveBeenCalledWith('/ledger/journal-entries/je-3/reverse'));
  });

  it.each(['fetch', 'live'] as const)('offers Reverse on a Tally CSV entry, not an XML import one (Q8, %s list)', async (mode) => {
    const csv = { ...base, id: 'je-5', entry_number: 5, entry_date: '2026-04-14', narration: 'Gate repair', source_type: 'tally_csv', total_debit: '40.00', total_credit: '40.00', posted_by_name: 'Asha Rao' };
    const xml = { ...csv, id: 'je-4', entry_number: 4, narration: 'Pump repair', source_type: 'tally_voucher' };
    get.mockResolvedValue({ data: [csv, xml], total: 2 });
    renderList(mode);
    const table = mode === 'fetch' ? await fetchApril() : screen.getByRole('table', { name: 'Journal Entries' });
    await within(table).findByText('Gate repair');
    const rows = within(table).getAllByRole('row').slice(1);

    expect(rows[0].textContent).toContain('Tally import (CSV)');
    expect(within(rows[1]).queryByRole('button', { name: 'Reverse' })).toBeNull();
    fireEvent.click(within(rows[0]).getByRole('button', { name: 'Reverse' }));
    expect(screen.getByText(/Importing the same Tally file again does not post it back\./)).toBeTruthy();
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Reverse' }));
    await waitFor(() => expect(post).toHaveBeenCalledWith('/ledger/journal-entries/je-5/reverse'));
  });

  it('shows the list to a committee member without Reverse', async () => {
    signIn('committee_member');
    renderList();
    const table = await fetchApril();

    expect(within(table).queryByRole('columnheader', { name: 'Reverse' })).toBeNull();
    expect(within(table).queryAllByRole('button', { name: 'Reverse' })).toHaveLength(0);
  });

  it('asks for reversal pairs too once Show Reversals is ticked', async () => {
    renderList();
    await fetchApril();
    fireEvent.click(screen.getByLabelText('Show Reversals'));

    await waitFor(() =>
      expect(get).toHaveBeenLastCalledWith('/ledger/journal-entries', {
        params: { start_date: '2026-04-01', end_date: '2026-04-30', page: '1', limit: '25' },
      }),
    );
  });

  it('loads at once in the standard tab, on the current financial year', async () => {
    renderList('live');
    await screen.findByText('Gate repair');
    expect(get.mock.calls[0][1]).toMatchObject({ params: { start_date: expect.stringMatching(/-04-01$/) } });
  });
});
