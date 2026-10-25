import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { JournalEntryViewPage } from './journal-entries/[id]/journal-entry-view';

// GL-S7 entry view: Reverse for a manual or Tally CSV entry (G6, widened by Q8).

const mocks = vi.hoisted(() => ({ sourceType: 'tally_csv', isReversed: false }));
vi.mock('@/hooks/use-stored-file', () => ({ useOpenStoredFile: () => vi.fn() }));
vi.mock('@/components/show-logs', () => ({ ShowLogsButton: () => null }));
vi.mock('./journal-entries/reverse-entry-dialog', () => ({ ReverseEntryDialog: () => null }));
vi.mock('@/hooks/use-journal-entries', () => ({
  useJournalEntry: () => ({
    isLoading: false,
    isError: false,
    data: {
      id: 'je-7', financial_year_id: 'fy', entry_number: 7, entry_date: '2026-05-10', narration: 'Lift repair', source_type: mocks.sourceType,
      source_id: null, posted_by: 'u1', posted_by_name: 'Ravi', created_at: '2026-05-10T05:00:00Z', is_reversed: mocks.isReversed,
      attachment_key: null, lines: [],
    },
  }),
}));

const SOCIETY = '11111111-1111-4111-8111-111111111111';
function signIn(role: string): void {
  localStorage.setItem('communityos_tenant', SOCIETY);
  localStorage.setItem(
    'communityos_user',
    JSON.stringify({ id: 'u1', name: 'A', phone: '+910000000010', isSuperAdmin: false, role, societies: [{ id: SOCIETY, name: 'S', role }] }),
  );
}

function reverseButton(): HTMLElement | null {
  render(<JournalEntryViewPage id="je-7" />);
  return screen.queryByRole('button', { name: 'Reverse' });
}

beforeEach(() => {
  signIn('accountant');
  mocks.sourceType = 'tally_csv';
  mocks.isReversed = false;
});
afterEach(() => localStorage.clear());

describe('journal entry view Reverse', () => {
  it('is offered on a Tally CSV entry, as on a manual one', () => {
    expect(reverseButton()).toBeTruthy();
    expect(screen.getByText('Tally import (CSV)')).toBeTruthy();
  });

  it.each(['tally_voucher', 'invoice', 'vendor_payment'])('is not offered on a %s entry', (sourceType) => {
    mocks.sourceType = sourceType;
    expect(reverseButton()).toBeNull();
  });

  it('is not offered once the CSV entry is reversed', () => {
    mocks.isReversed = true;
    expect(reverseButton()).toBeNull();
  });

  it('is not offered to a committee member', () => {
    signIn('committee_member');
    expect(reverseButton()).toBeNull();
  });
});
