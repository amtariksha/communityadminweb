import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/api';
import { ApiError } from '@/lib/api-error';
import { BulkCorrectionsPage } from './journal-entries/bulk-corrections/bulk-corrections-page';

// General Ledger › Bulk Corrections (GL-25, screen GL-S10).

vi.mock('@/lib/api', () => ({ api: { get: vi.fn(), post: vi.fn() } }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('@/components/ui/account-search-select', () => ({
  AccountSearchSelect: ({ value, onChange }: { value: string; onChange: (id: string) => void }) => (
    <input aria-label="Account" value={value} onChange={(event) => onChange(event.target.value)} />
  ),
}));

const ENTRY = {
  id: 'je-1', entry_number: 12, entry_date: '2026-05-10', narration: 'Pump repair',
  lines: [
    { ledger_account_id: 'acct-repairs', account_code: '5101', account_name: 'Repairs', debit: '500.00', credit: '0.00' },
    { ledger_account_id: 'acct-bank', account_code: 'bank', account_name: 'Bank', debit: '0.00', credit: '500.00' },
  ],
};

const get = vi.mocked(api.get);
const post = vi.mocked(api.post);
beforeEach(() => {
  get.mockResolvedValue({ data: [ENTRY] });
  post.mockResolvedValue({ data: [{ entry_id: 'je-1', entry_number: 12, reversal_entry_number: 13, corrected_entry_id: 'je-14', corrected_entry_number: 14 }] });
});
afterEach(() => vi.clearAllMocks());

async function openEntry() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <BulkCorrectionsPage />
    </QueryClientProvider>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Fetch' }));
  return screen.findByRole('region', { name: 'Entry #12' });
}

describe('Bulk Corrections', () => {
  it('sends only the changed entry with its new account, marked Changed', async () => {
    const block = await openEntry();
    fireEvent.change(within(block).getAllByLabelText('Account')[0], { target: { value: 'acct-electricity' } });
    expect(within(block).getByText('Changed')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/ }));
    await waitFor(() => expect(post).toHaveBeenCalled());
    expect(post).toHaveBeenCalledWith('/ledger/journal-entries/bulk-correct', [{
      entry_id: 'je-1',
      lines: [{ ledger_account_id: 'acct-electricity', debit: 500, credit: 0 }, { ledger_account_id: 'acct-bank', debit: 0, credit: 500 }],
    }]);
  });

  it('blocks Save while a changed entry does not balance and highlights it', async () => {
    const block = await openEntry();
    fireEvent.change(within(block).getByLabelText('Debit, entry 12 line 1'), { target: { value: '450' } });
    expect(within(block).getByRole('alert').textContent).toContain('differ by');
    expect((screen.getByRole('button', { name: /Save Changes/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('shows the API’s refusal on the entry it names', async () => {
    post.mockRejectedValue(new ApiError(400, { message: 'One row could not be saved.', code: 'bulk_rows_invalid', errors: { 'corrections.0.entry_id': ['The financial year covering 2026-05-10 is frozen.'] } } as never));
    const block = await openEntry();
    fireEvent.change(within(block).getByLabelText('Narration, entry 12'), { target: { value: 'Pump repair, May' } });
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/ }));
    expect(await within(block).findByText(/is frozen/)).toBeTruthy();
  });

  it('says when the server does not have it yet', async () => {
    get.mockRejectedValue(new ApiError(404, { message: 'Not Found' } as never));
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <BulkCorrectionsPage />
      </QueryClientProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Fetch' }));
    expect(await screen.findByText(/not available yet/)).toBeTruthy();
  });
});
