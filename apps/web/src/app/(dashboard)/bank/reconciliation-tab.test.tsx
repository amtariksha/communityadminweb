import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ReconciliationTab } from './reconciliation-tab';

const ACCOUNT = 'acct-1';

const mocks = vi.hoisted(() => ({
  addToast: vi.fn(),
  reconcile: vi.fn(),
  unreconcile: vi.fn(),
  saveStatement: vi.fn(),
  register: undefined as unknown,
  summary: undefined as unknown,
}));

vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: mocks.addToast }) }));
vi.mock('@/hooks', () => ({
  useReconciliation: () => ({ data: mocks.register, isLoading: false }),
  useBRSSummary: () => ({ data: mocks.summary }),
  useReconcileTransaction: () => ({ mutate: mocks.reconcile, isPending: false }),
  useUnreconcileTransaction: () => ({ mutate: mocks.unreconcile, isPending: false }),
  useSaveStatementBalance: () => ({ mutate: mocks.saveStatement, isPending: false }),
}));

// What GET /bank/reconciliation/:accountId returns.
const row = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  journal_entry_id: `je-${id}`,
  entry_date: '2026-10-03',
  entry_number: '12',
  document_no: 'RCT-0007',
  instrument_no: 'NEFT123',
  narration: 'Maintenance Oct',
  amount: 500,
  transaction_type: 'debit',
  bank_date: null,
  is_reconciled: false,
  ...overrides,
});

beforeEach(() => {
  mocks.register = {
    bank_account: { id: ACCOUNT, account_name: null, bank_name: 'Test Bank', account_number: '0001' },
    book_balance: 1300,
    bank_balance: 500,
    rows: [
      row('line-1'),
      row('line-2', { document_no: 'PMT-BILL-9', instrument_no: null, narration: 'Plumber', amount: -200, transaction_type: 'credit' }),
      row('line-3', { document_no: 'RCT-0008', is_reconciled: true, bank_date: '2026-10-05', amount: 1000 }),
    ],
  };
  mocks.summary = { book_balance: 1300, bank_balance: 500, last_statement: null };
});
afterEach(() => vi.clearAllMocks());

function open(): void {
  render(<ReconciliationTab accounts={[{ id: ACCOUNT, bank_name: 'Test Bank', account_number: '0001' }]} />);
  fireEvent.change(screen.getByLabelText('Bank Account'), { target: { value: ACCOUNT } });
}

const rowOf = (documentNo: string): HTMLElement =>
  screen.getByText(documentNo).closest('tr') as HTMLElement;

describe('ReconciliationTab', () => {
  it('lists the register\'s lines from the API shape, unreconciled ones with a blank bank date', () => {
    open();

    const first = rowOf('RCT-0007');
    expect(within(first).getByText('NEFT123')).toBeTruthy();
    expect(within(first).getByText('Maintenance Oct')).toBeTruthy();
    expect((within(first).getByLabelText('Bank date for RCT-0007') as HTMLInputElement).value).toBe('');
    expect(within(rowOf('PMT-BILL-9')).getByText('Plumber')).toBeTruthy();
  });

  it('shows the book balance and the bank balance', () => {
    open();

    expect(screen.getByText('Book Balance').parentElement?.parentElement?.textContent).toContain('1,300');
    expect(screen.getByText('Bank Balance').parentElement?.parentElement?.textContent).toContain('500');
  });

  it('ticking a line sends its bank date as bank_date', () => {
    open();
    const first = rowOf('RCT-0007');

    expect((within(first).getByRole('button', { name: 'Reconcile' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(within(first).getByLabelText('Bank date for RCT-0007'), { target: { value: '2026-10-05' } });
    fireEvent.click(within(first).getByRole('button', { name: 'Reconcile' }));

    expect(mocks.reconcile).toHaveBeenCalledWith(
      { id: 'line-1', data: { bank_date: '2026-10-05' } },
      expect.anything(),
    );
  });

  it('a reconciled line shows its bank date and can be undone', () => {
    open();
    const reconciled = rowOf('RCT-0008');

    expect(within(reconciled).getByText('05 Oct 2026')).toBeTruthy();
    fireEvent.click(within(reconciled).getByRole('button', { name: 'Undo' }));

    expect(mocks.unreconcile).toHaveBeenCalledWith('line-3', expect.anything());
  });

  it('saves a statement balance for the chosen account', () => {
    open();

    fireEvent.change(screen.getByLabelText('Statement date'), { target: { value: '2026-10-10' } });
    fireEvent.change(screen.getByLabelText('Statement balance'), { target: { value: '800.50' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save statement balance' }));

    expect(mocks.saveStatement).toHaveBeenCalledWith(
      { accountId: ACCOUNT, statement_date: '2026-10-10', statement_balance: 800.5 },
      expect.anything(),
    );
  });

  it('shows the last statement\'s difference from the bank balance', () => {
    mocks.summary = {
      book_balance: 1300,
      bank_balance: 500,
      last_statement: { date: '2026-10-10', balance: 800, difference: 300 },
    };
    open();

    const card = screen.getByText('Difference').parentElement?.parentElement as HTMLElement;
    expect(card.textContent).toContain('300');
    expect(screen.getByText(/Statement balance of/).textContent).toContain('10 Oct 2026');
  });

  it('has no difference to show before a statement balance is entered', () => {
    open();
    const card = screen.getByText('Difference').parentElement?.parentElement as HTMLElement;
    expect(card.textContent).toContain('—');
  });

  it('says so when the period has no lines', () => {
    mocks.register = { ...(mocks.register as object), rows: [] };
    open();
    expect(screen.getByText('No transactions in this period')).toBeTruthy();
  });
});
