import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { JournalEntryViewPage } from './journal-entries/[id]/journal-entry-view';

// GL-20: the entry view opens its supporting file through the signed-link helper.

const mocks = vi.hoisted(() => ({ open: vi.fn() }));
vi.mock('@/hooks/use-stored-file', () => ({ useOpenStoredFile: () => mocks.open }));
vi.mock('@/components/show-logs', () => ({ ShowLogsButton: () => null }));
vi.mock('./journal-entries/reverse-entry-dialog', () => ({ ReverseEntryDialog: () => null }));
vi.mock('@/hooks/use-journal-entries', () => ({
  useJournalEntry: () => ({
    isLoading: false,
    isError: false,
    data: {
      id: 'je-1', financial_year_id: 'fy', entry_number: 12, entry_date: '2026-05-10', narration: 'Generator repair', source_type: 'manual',
      source_id: null, posted_by: 'u1', posted_by_name: 'Ravi', created_at: '2026-05-10T05:00:00Z', is_reversed: false,
      attachment_key: 'tenants/t-1/journal/bill.pdf', lines: [],
    },
  }),
}));

describe('journal entry view attachment', () => {
  it('opens the attachment by its key', () => {
    render(<JournalEntryViewPage id="je-1" />);
    fireEvent.click(screen.getByRole('button', { name: 'bill.pdf' }));
    expect(mocks.open).toHaveBeenCalledWith({ key: 'tenants/t-1/journal/bill.pdf' });
  });
});
