// API responses carry computed / joined fields beyond the shared types.

export interface BankAccountRow {
  id: string;
  account_name?: string | null;
  bank_name: string;
  // BANK-14: null on a petty-cash account.
  account_number: string | null;
  ifsc_code: string | null;
  account_kind?: 'bank' | 'petty_cash';
  account_type: string;
  branch: string;
  opening_balance: number;
  // QA #101 / #248 — the balance from the account's ledger lines.
  current_balance?: number;
  /** BANK-08: lines on the ledger to today, and those with a bank date. */
  book_balance?: number;
  bank_balance?: number;
  is_primary: boolean;
  is_active: boolean;
}

export interface BankTransferRow {
  id: string;
  from_account_id: string;
  to_account_id: string;
  from_account_name?: string | null;
  to_account_name?: string | null;
  amount: number;
  transfer_date: string | Date;
  reference_number: string | null;
  // QA #293 — the column is `notes`; older callers read `narration`.
  notes?: string | null;
  narration?: string | null;
  // BANK-10; absent from an older API.
  transfer_number?: string | null;
  transferred_by_name?: string | null;
  status?: 'active' | 'cancelled';
  cancel_reason?: string | null;
}

export interface FixedDepositRow {
  id: string;
  bank_account_id: string;
  bank_name?: string;
  fd_number: string;
  principal_amount: number;
  interest_rate: number;
  start_date: string | Date;
  maturity_date: string | Date;
  maturity_amount: number;
  status: string;
  // BANK-11; absent from an older API.
  archived_at?: string | null;
  archive_reason?: string | null;
}

/** "<bank name> (<last 4 of the account number>)" for a bank, its name for petty cash (BANK-S2, BANK-14). */
export function accountLabel(account: Pick<BankAccountRow, 'bank_name' | 'account_number'> & Partial<Pick<BankAccountRow, 'account_kind' | 'account_name'>>): string {
  if (account.account_kind === 'petty_cash') return account.account_name ?? 'Petty Cash';
  const last4 = (account.account_number ?? '').slice(-4);
  return last4 ? `${account.bank_name} (${last4})` : account.bank_name;
}

/** A bank or cash ledger in an account list: what "Paid from" / receiving pickers offer (BANK-14). */
export function isMoneyLedgerAccount(account: { is_bank_account?: boolean; code?: string | null; group_name?: string | null }): boolean {
  return account.is_bank_account === true || account.code === 'cash' || account.group_name === 'Cash-in-Hand';
}

export function computeDaysToMaturity(maturityDate: string): number {
  const diffMs = new Date(maturityDate).getTime() - Date.now();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export function getFDStatusVariant(status: string): 'success' | 'secondary' | 'warning' | 'default' {
  switch (status) {
    case 'active':
      return 'success';
    case 'matured':
      return 'secondary';
    case 'renewed':
      return 'warning';
    default:
      return 'default';
  }
}

/** Active Fixed Deposits = active; Archived = matured, renewed, withdrawn (BANK-S8). */
export type FdScope = 'all' | 'active' | 'archived';

export function inFdScope(status: string, scope: FdScope): boolean {
  if (scope === 'all') return true;
  return scope === 'active' ? status === 'active' : status !== 'active';
}
