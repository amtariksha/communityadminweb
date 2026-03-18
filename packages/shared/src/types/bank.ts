export type BankAccountType = 'savings' | 'current' | 'fixed_deposit';

export interface BankAccount {
  id: string;
  tenant_id: string;
  ledger_account_id: string;
  bank_name: string;
  account_number: string;
  ifsc_code: string;
  account_type: BankAccountType;
  branch: string;
  opening_balance: number;
  is_primary: boolean;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface BankTransfer {
  id: string;
  tenant_id: string;
  financial_year_id: string;
  from_bank_account_id: string;
  to_bank_account_id: string;
  amount: number;
  transfer_date: Date;
  reference_number: string | null;
  narration: string;
  journal_entry_id: string | null;
  created_by: string;
  created_at: Date;
}

export type ReconciliationStatus = 'pending' | 'matched' | 'unmatched' | 'adjusted';

export interface BankReconciliation {
  id: string;
  tenant_id: string;
  bank_account_id: string;
  statement_date: Date;
  statement_balance: number;
  book_balance: number;
  reconciled_balance: number;
  status: ReconciliationStatus;
  reconciled_by: string | null;
  reconciled_at: Date | null;
  created_at: Date;
}

export type FixedDepositStatus = 'active' | 'matured' | 'prematurely_closed';

export interface FixedDeposit {
  id: string;
  tenant_id: string;
  bank_account_id: string;
  fd_number: string;
  principal_amount: number;
  interest_rate: number;
  start_date: Date;
  maturity_date: Date;
  maturity_amount: number;
  status: FixedDepositStatus;
  linked_ledger_account_id: string;
  created_at: Date;
  updated_at: Date;
}
