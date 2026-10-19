import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { LedgerAccount } from '@communityos/shared';
import { ImportBalancesDialog } from './import-balances-dialog';
import { importPayload, importSummary, parseOpeningBalanceCsv } from './opening-balance-import';

const mocks = vi.hoisted(() => ({ addToast: vi.fn(), importBalances: vi.fn() }));

vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: mocks.addToast }) }));
vi.mock('@/hooks', () => ({
  useBulkImportBalances: () => ({ mutate: mocks.importBalances, isPending: false }),
}));

function account(id: string, code: string, name: string): LedgerAccount {
  return {
    id,
    tenant_id: 't-1',
    group_id: 'g-1',
    name,
    code,
    opening_balance: 0,
    balance_type: 'debit',
    is_bank_account: false,
    bank_details: null,
    is_system: false,
    is_active: true,
    created_at: '2026-04-01',
  };
}

const ACCOUNTS = [account('acc-1001', '1001', 'Fixed Deposit'), account('acc-2001', '2001', 'Security Deposits')];
const CSV = 'account_code,amount,balance_type\n1001,50000,debit\n2001,30000,Cr\n9999,10,debit\n';

afterEach(() => vi.clearAllMocks());

describe('parseOpeningBalanceCsv', () => {
  it('matches codes, reads Dr / Cr, and keeps unmatched rows to send by code', () => {
    const parsed = parseOpeningBalanceCsv(CSV, ACCOUNTS);
    expect('rows' in parsed && parsed.rows).toEqual([
      { account_code: '1001', amount: 50000, balance_type: 'debit', account_id: 'acc-1001', account_name: 'Fixed Deposit' },
      { account_code: '2001', amount: 30000, balance_type: 'credit', account_id: 'acc-2001', account_name: 'Security Deposits' },
      { account_code: '9999', amount: 10, balance_type: 'debit', account_id: null, account_name: null },
    ]);
  });

  it('marks a type it cannot read instead of guessing a side', () => {
    const parsed = parseOpeningBalanceCsv('account_code,amount,balance_type\n1001,5,owed\n', ACCOUNTS);
    expect('rows' in parsed && parsed.rows[0].balance_type).toBeNull();
  });

  it('refuses a file without the code and amount columns', () => {
    expect(parseOpeningBalanceCsv('code,value\n1001,5\n', ACCOUNTS)).toEqual({
      error: 'CSV must have account_code and amount columns',
    });
  });
});

describe('importPayload / importSummary', () => {
  it('sends matched rows by id and the rest by code', () => {
    const parsed = parseOpeningBalanceCsv(CSV, ACCOUNTS);
    const rows = 'rows' in parsed ? parsed.rows : [];
    expect(importPayload(rows).balances).toEqual([
      { account_id: 'acc-1001', amount: 50000, balance_type: 'debit' },
      { account_id: 'acc-2001', amount: 30000, balance_type: 'credit' },
      { account_code: '9999', amount: 10, balance_type: 'debit' },
    ]);
  });

  it('says how many balances and entries', () => {
    expect(importSummary({ updated: 2, entries_posted: 1, errors: [] })).toBe('2 balances imported, 1 entry posted');
    expect(importSummary({ updated: 1 })).toBe('1 balance imported');
  });
});

async function uploadCsv(text: string): Promise<void> {
  fireEvent.click(screen.getByRole('button', { name: /Import Balances/ }));
  const file = new File([text], 'balances.csv', { type: 'text/csv' });
  fireEvent.change(screen.getByLabelText('CSV file'), { target: { files: [file] } });
  await screen.findByText('1001');
}

describe('ImportBalancesDialog', () => {
  it('shows the count of balances imported and entries posted', async () => {
    mocks.importBalances.mockImplementation((_input, options) => {
      options.onSuccess({ data: { updated: 2, entries_posted: 2, errors: [] } });
    });
    render(<ImportBalancesDialog accounts={ACCOUNTS} />);
    await uploadCsv('account_code,amount,balance_type\n1001,50000,debit\n2001,30000,credit\n');

    fireEvent.click(screen.getByRole('button', { name: 'Import 2 Balances' }));

    expect(mocks.addToast).toHaveBeenCalledWith({ title: '2 balances imported, 2 entries posted', variant: 'success' });
  });

  it('shows the API\'s row errors on their rows and keeps the dialog open', async () => {
    mocks.importBalances.mockImplementation((_input, options) => {
      options.onSuccess({ data: { updated: 0, entries_posted: 0, errors: [{ row: 3, code: 'account_not_found' }] } });
    });
    render(<ImportBalancesDialog accounts={ACCOUNTS} />);
    await uploadCsv(CSV);

    fireEvent.click(screen.getByRole('button', { name: 'Import 3 Balances' }));

    await waitFor(() => expect(screen.getByText('No account has this code')).toBeTruthy());
    expect(mocks.addToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Nothing imported' }));
    expect(screen.getByText('Import Opening Balances')).toBeTruthy();
  });

  it('will not import while a row\'s Dr / Cr cannot be read', async () => {
    render(<ImportBalancesDialog accounts={ACCOUNTS} />);
    await uploadCsv('account_code,amount,balance_type\n1001,50000,owed\n');

    expect((screen.getByRole('button', { name: 'Import 1 Balances' }) as HTMLButtonElement).disabled).toBe(true);
  });
});
