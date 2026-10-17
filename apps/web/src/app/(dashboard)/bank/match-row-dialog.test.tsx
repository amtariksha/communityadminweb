import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { candidateLines, MatchRowDialog } from './match-row-dialog';

const mocks = vi.hoisted(() => ({
  addToast: vi.fn(),
  match: vi.fn(),
  rows: [] as unknown[],
  range: [] as string[],
}));

vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: mocks.addToast }) }));
vi.mock('@/hooks', () => ({
  useReconciliation: (_account: string, from: string, to: string) => {
    mocks.range = [from, to];
    return { data: { rows: mocks.rows }, isLoading: false };
  },
  useManualMatchRow: () => ({ mutate: mocks.match, isPending: false }),
}));

const line = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  journal_entry_id: `je-${id}`,
  entry_date: '2026-10-03',
  document_no: `DOC-${id}`,
  narration: `Narration ${id}`,
  amount: 500,
  is_reconciled: false,
  ...overrides,
});

describe('candidateLines', () => {
  const deposit = { debit: 0, credit: 500, transaction_date: '2026-10-04' };
  const withdrawal = { debit: 500, credit: 0, transaction_date: '2026-10-04' };

  it('keeps unreconciled lines in the statement row\'s direction: a deposit is money in', () => {
    const lines = [line('in'), line('out', { amount: -500 }), line('done', { is_reconciled: true })];
    expect(candidateLines(lines as never, deposit).map((l) => l.id)).toEqual(['in']);
    expect(candidateLines(lines as never, withdrawal).map((l) => l.id)).toEqual(['out']);
  });

  it('puts lines of the same amount first, then the nearest in date', () => {
    const lines = [
      line('far', { amount: 700, entry_date: '2026-10-04' }),
      line('exact-late', { entry_date: '2026-10-08' }),
      line('exact-near', { entry_date: '2026-10-03' }),
    ];
    expect(candidateLines(lines as never, deposit).map((l) => l.id)).toEqual(['exact-near', 'exact-late', 'far']);
  });
});

describe('MatchRowDialog', () => {
  const row = {
    id: 'stmt-1',
    transaction_date: '2026-10-04',
    description: 'NEFT receipt',
    debit: 0,
    credit: 500,
  };

  beforeEach(() => {
    mocks.rows = [line('a'), line('b', { amount: 750 })];
  });
  afterEach(() => vi.clearAllMocks());

  it('looks for lines within ten days of the statement row\'s date', () => {
    render(<MatchRowDialog row={row as never} accountId="acct-1" onClose={vi.fn()} />);
    expect(mocks.range).toEqual(['2026-09-24', '2026-10-14']);
  });

  it('matches the chosen line\'s journal entry to the statement row', () => {
    render(<MatchRowDialog row={row as never} accountId="acct-1" onClose={vi.fn()} />);

    fireEvent.click(screen.getByLabelText(/DOC-a/));
    fireEvent.click(screen.getByRole('button', { name: 'Match' }));

    expect(mocks.match).toHaveBeenCalledWith({ row_id: 'stmt-1', journal_entry_id: 'je-a' }, expect.anything());
  });

  it('cannot match until a line is chosen', () => {
    render(<MatchRowDialog row={row as never} accountId="acct-1" onClose={vi.fn()} />);
    expect((screen.getByRole('button', { name: 'Match' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('says so when there is nothing to match against', () => {
    mocks.rows = [];
    render(<MatchRowDialog row={row as never} accountId="acct-1" onClose={vi.fn()} />);
    expect(screen.getByText(/No unreconciled lines/)).toBeTruthy();
  });
});
