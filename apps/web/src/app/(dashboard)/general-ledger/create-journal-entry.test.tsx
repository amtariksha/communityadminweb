import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api-error';
import { JournalEntryForm } from '../accounts/journal-entry-form/journal-entry-form';
import { CreateJournalEntryPage } from './journal-entries/create/create-journal-entry-page';

// Create Journal Entry as a page (GL-11, GL-S6) and the same form as the standard dialog.

const mocks = vi.hoisted(() => ({ mutate: vi.fn(), push: vi.fn(), upload: vi.fn() }));
vi.mock('@/hooks/use-documents', () => ({ useUploadFileToS3: () => ({ mutateAsync: mocks.upload, isPending: false }) }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('@/components/ui/account-search-select', () => ({
  AccountSearchSelect: ({ value, onChange }: { value: string; onChange: (id: string) => void }) => (
    <input aria-label="Account" value={value} onChange={(event) => onChange(event.target.value)} />
  ),
}));
vi.mock('@/hooks', () => ({
  useFinancialYears: () => ({
    data: [{ id: 'fy-26', label: '2026-27', start_date: '2026-04-01', end_date: '2027-03-31', is_current: true, is_frozen: false }],
  }),
  useCreateJournalEntry: () => ({ mutate: mocks.mutate, isPending: false }),
}));

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-05-10T06:00:00Z'));
});
afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

function fillLine(index: number, account: string, side: 'Debit' | 'Credit', amount: string): void {
  fireEvent.change(screen.getAllByLabelText('Account')[index], { target: { value: account } });
  fireEvent.change(screen.getByLabelText(`${side}, line ${index + 1}`), { target: { value: amount } });
}

function fillBalancedEntry(): void {
  fillLine(0, 'acct-repairs', 'Debit', '500');
  fillLine(1, 'acct-bank', 'Credit', '500');
  fireEvent.change(screen.getByLabelText('Narration'), { target: { value: 'Lift repair' } });
}

const submit = () => screen.getByRole('button', { name: 'Submit' }) as HTMLButtonElement;

describe('Create Journal Entry page', () => {
  it('is a fixed grid of 10 lines with no year or voucher choice', () => {
    render(<CreateJournalEntryPage />);
    expect(screen.getByRole('heading', { name: 'Free Flow Journal Entries' })).toBeTruthy();
    expect(within(screen.getByRole('table', { name: 'Journal lines' })).getAllByRole('row')).toHaveLength(12);
    expect(screen.queryByLabelText('Financial year')).toBeNull();
    expect(screen.queryByLabelText(/Voucher type/)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Add 5 lines' }));
    expect(screen.getAllByLabelText('Account')).toHaveLength(15);
  });

  it('keeps Submit disabled while the entry does not balance', () => {
    render(<CreateJournalEntryPage />);
    fillLine(0, 'acct-repairs', 'Debit', '500');
    fillLine(1, 'acct-bank', 'Credit', '400');
    fireEvent.change(screen.getByLabelText('Narration'), { target: { value: 'Lift repair' } });

    expect(screen.getByText('Difference: ₹100')).toBeTruthy();
    expect(submit().disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Credit, line 2'), { target: { value: '500' } });
    expect(submit().disabled).toBe(false);
  });

  it('posts a balanced journal in the year of its date and says which entry was posted', () => {
    mocks.mutate.mockImplementation((_body, options) => options.onSuccess({ data: { id: 'je-41', entry_number: 41 } }));
    render(<CreateJournalEntryPage />);
    fillBalancedEntry();
    fireEvent.click(submit());

    expect(mocks.mutate).toHaveBeenCalledWith(
      {
        entry_date: '2026-05-10',
        narration: 'Lift repair',
        voucher_type_name: 'Journal',
        lines: [
          { ledger_account_id: 'acct-repairs', debit: 500, credit: 0 },
          { ledger_account_id: 'acct-bank', debit: 0, credit: 500 },
        ],
      },
      expect.anything(),
    );
    const status = screen.getByText('Entry #41 posted.').closest('[role="status"]') as HTMLElement;
    expect(status).toBeTruthy();
    expect(within(status).getByRole('link', { name: 'View it' }).getAttribute('href')).toBe('/general-ledger/journal-entries/je-41');
    expect((screen.getByLabelText('Narration') as HTMLTextAreaElement).value).toBe('');
  });

  it('shows the refusal for a date in a frozen year, by its code', () => {
    mocks.mutate.mockImplementation((_body, options) =>
      options.onError(new ApiError(403, { message: 'Financial year covering 2026-05-10 is frozen.', code: 'financial_year_frozen' } as never)),
    );
    render(<CreateJournalEntryPage />);
    fillBalancedEntry();
    fireEvent.click(submit());

    expect(screen.getByRole('alert').textContent).toContain('is frozen');
    expect(screen.queryByText(/posted\./)).toBeNull();
  });

  it('flags a line with an amount and no account', () => {
    render(<CreateJournalEntryPage />);
    fillBalancedEntry();
    fireEvent.change(screen.getByLabelText('Debit, line 3'), { target: { value: '10' } });

    expect(screen.getByText('Choose an account on line 3.')).toBeTruthy();
    expect(submit().disabled).toBe(true);
  });

  it('Close returns to Old Journal Entries', () => {
    render(<CreateJournalEntryPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(mocks.push).toHaveBeenCalledWith('/general-ledger/journal-entries/old');
  });
});

describe('the same form as the standard dialog', () => {
  it('keeps the year and voucher type and sends them', () => {
    render(<JournalEntryForm mode="dialog" open onClose={vi.fn()} onSaved={vi.fn()} />);
    expect((screen.getByLabelText('Financial year') as HTMLSelectElement).value).toBe('fy-26');
    const [debit, credit] = screen.getAllByLabelText('Amount');
    fireEvent.change(screen.getAllByLabelText('Account')[0], { target: { value: 'acct-repairs' } });
    fireEvent.change(debit, { target: { value: '200' } });
    fireEvent.change(screen.getAllByLabelText('Account')[1], { target: { value: 'acct-bank' } });
    fireEvent.change(credit, { target: { value: '200' } });
    fireEvent.change(screen.getByLabelText('Narration'), { target: { value: 'Pump repair' } });
    fireEvent.click(screen.getByRole('button', { name: 'Post entry' }));

    expect(mocks.mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        financial_year_id: 'fy-26',
        voucher_type_name: 'Journal',
        lines: [
          { ledger_account_id: 'acct-repairs', debit: 200, credit: 0 },
          { ledger_account_id: 'acct-bank', debit: 0, credit: 200 },
        ],
      }),
      expect.anything(),
    );
  });
});

describe('Create Journal Entry attachment (GL-20)', () => {
  it('uploads the picked PDF as a journal_entry file and posts its key', async () => {
    mocks.upload.mockResolvedValue({ key: 'tenants/t-1/journal/bill.pdf', fileUrl: 'https://store/tenants/t-1/journal/bill.pdf' });
    render(<CreateJournalEntryPage />);
    fillBalancedEntry();
    const file = new File(['%PDF'], 'bill.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByLabelText('Attachment'), { target: { files: [file] } });
    fireEvent.click(submit());
    await vi.waitFor(() => expect(mocks.mutate).toHaveBeenCalled());
    expect(mocks.upload).toHaveBeenCalledWith({ file, purpose: 'journal_entry' });
    expect(mocks.mutate.mock.calls[0][0]).toMatchObject({ attachment_key: 'tenants/t-1/journal/bill.pdf' });
  });

  it('refuses a file that is not a PDF or image', () => {
    render(<CreateJournalEntryPage />);
    fillBalancedEntry();
    fireEvent.change(screen.getByLabelText('Attachment'), { target: { files: [new File(['x'], 'notes.txt', { type: 'text/plain' })] } });
    expect(screen.getByText('Attach a PDF, JPEG or PNG file.')).toBeTruthy();
    expect(submit().disabled).toBe(true);
  });
});
