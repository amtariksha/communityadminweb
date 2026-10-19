import type { LedgerAccount } from '@communityos/shared';

/** One data row of an opening-balances CSV, matched to an account where possible. */
export interface OpeningBalanceRow {
  account_code: string;
  amount: number;
  /** null when the file's Dr / Cr cell could not be read. */
  balance_type: 'debit' | 'credit' | null;
  account_id: string | null;
  account_name: string | null;
}

export interface OpeningBalanceImportResult {
  updated: number;
  /** Absent from an API older than GL-05, which posted no entries. */
  entries_posted?: number;
  errors?: Array<{ row: number; code: string }>;
}

export const TEMPLATE_CSV = 'account_code,amount,balance_type\n1001,50000,debit\n2001,30000,credit\n';

const ROW_ERRORS: Record<string, string> = {
  account_not_found: 'No account has this code',
  duplicate_account: 'This account is already on an earlier row',
};

export function rowErrorText(code: string): string {
  return ROW_ERRORS[code] ?? code;
}

const SIDES: Record<string, 'debit' | 'credit'> = {
  '': 'debit',
  debit: 'debit',
  dr: 'debit',
  credit: 'credit',
  cr: 'credit',
};

function balanceSide(cell: string | undefined): 'debit' | 'credit' | null {
  return SIDES[(cell ?? '').trim().toLowerCase()] ?? null;
}

export function hasUnreadableSide(rows: OpeningBalanceRow[]): boolean {
  return rows.some((row) => row.balance_type === null);
}

/**
 * Matches on code or name, ignoring case, so a file exported from Tally
 * (names) works as well as one keyed by code. A row the list here does not
 * match is still sent, by its code: the API checks it again (this page loads
 * at most 500 accounts) and saves nothing if it is still unknown.
 */
export function parseOpeningBalanceCsv(
  text: string,
  accounts: LedgerAccount[],
): { rows: OpeningBalanceRow[] } | { error: string } {
  const lines = text.split('\n').filter((line) => line.trim());
  if (lines.length < 2) return { error: 'CSV file is empty or has no data rows' };

  const headers = lines[0].split(',').map((header) => header.trim().toLowerCase());
  const codeIdx = headers.indexOf('account_code');
  const amountIdx = headers.indexOf('amount');
  const typeIdx = headers.indexOf('balance_type');
  if (codeIdx === -1 || amountIdx === -1) return { error: 'CSV must have account_code and amount columns' };

  const rows = lines.slice(1).map(function parseRow(line): OpeningBalanceRow {
    const cols = line.split(',').map((cell) => cell.trim());
    const code = cols[codeIdx] ?? '';
    const needle = code.toLowerCase();
    const match = accounts.find(
      (account) => account.code?.toLowerCase().trim() === needle || account.name?.toLowerCase().trim() === needle,
    );
    return {
      account_code: code,
      amount: parseFloat(cols[amountIdx] ?? '0') || 0,
      balance_type: typeIdx === -1 ? 'debit' : balanceSide(cols[typeIdx]),
      account_id: match?.id ?? null,
      account_name: match?.name ?? null,
    };
  });
  return { rows: rows.filter((row) => row.account_code && row.amount > 0) };
}

/** Matched rows go by id; the rest by the code written in the file. */
export function importPayload(rows: OpeningBalanceRow[]): {
  balances: Array<{ account_id?: string; account_code?: string; amount: number; balance_type: string }>;
} {
  return {
    balances: rows.map((row) => ({
      ...(row.account_id ? { account_id: row.account_id } : { account_code: row.account_code }),
      amount: row.amount,
      balance_type: row.balance_type ?? 'debit',
    })),
  };
}

export function importSummary(result: OpeningBalanceImportResult): string {
  const imported = `${result.updated} ${result.updated === 1 ? 'balance' : 'balances'} imported`;
  if (result.entries_posted === undefined) return imported;
  const posted = result.entries_posted;
  return `${imported}, ${posted} ${posted === 1 ? 'entry' : 'entries'} posted`;
}
