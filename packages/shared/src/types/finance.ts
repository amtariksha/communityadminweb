export type AccountType = 'asset' | 'liability' | 'income' | 'expense';
export type BalanceType = 'debit' | 'credit';

export interface AccountGroup {
  id: string;
  tenant_id: string;
  name: string;
  type: AccountType;
  parent_id: string | null;
  level: number;
  code: string;
  is_active: boolean;
  sort_order: number;
}

export interface LedgerAccount {
  id: string;
  tenant_id: string;
  group_id: string;
  name: string;
  code: string;
  opening_balance: number;
  balance_type: BalanceType;
  is_bank_account: boolean;
  bank_details: Record<string, unknown> | null;
  is_system: boolean;
  is_active: boolean;
  created_at: Date;
}

export interface FinancialYear {
  id: string;
  tenant_id: string;
  label: string;
  start_date: Date;
  end_date: Date;
  is_current: boolean;
  is_frozen: boolean;
}

export interface JournalEntry {
  id: string;
  tenant_id: string;
  financial_year_id: string;
  entry_number: string;
  entry_date: Date;
  narration: string;
  source_type: string;
  source_id: string | null;
  posted_by: string;
  is_reversed: boolean;
  created_at: Date;
}

export interface JournalLine {
  id: string;
  journal_entry_id: string;
  ledger_account_id: string;
  debit: number;
  credit: number;
}

export type InvoiceFrequency = 'monthly' | 'quarterly' | 'half_yearly' | 'yearly' | 'one_time';

export type InvoiceChargeType = 'flat' | 'area_based' | 'hybrid';

export interface InvoiceRule {
  id: string;
  tenant_id: string;
  name: string;
  ledger_account_id: string;
  frequency: InvoiceFrequency;
  amount: number;
  charge_type: InvoiceChargeType;
  is_per_sqft: boolean;
  is_gst_applicable: boolean;
  gst_rate: number;
  is_active: boolean;
  created_at: Date;
}

export type InvoiceStatus = 'draft' | 'sent' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';

export interface Invoice {
  id: string;
  tenant_id: string;
  financial_year_id: string;
  invoice_number: string;
  unit_id: string;
  // Dates are ISO strings over the wire even though pg types them as Date.
  invoice_date: string | Date;
  issue_date?: string | Date;
  due_date: string | Date;
  billing_period?: string;
  status: InvoiceStatus;
  subtotal?: number;
  gst_amount?: number;
  total_amount: number;
  net_amount?: number;
  amount_paid: number;
  /** @deprecated Backend returns `amount_paid`; kept for old callers. */
  paid_amount?: number;
  balance_due: number;
  lpi_amount: number;
  created_at: string | Date;
  // Joined fields returned by the list query.
  unit_number?: string;
  block?: string | null;
  owner_name?: string | null;
  owner_phone?: string | null;
  tenant_name?: string | null;
  lines?: InvoiceLine[];
}

export interface InvoiceLine {
  id: string;
  invoice_id: string;
  ledger_account_id: string;
  description: string;
  amount: number;
  gst_rate: number;
  gst_amount: number;
  total: number;
}

export type ReceiptMode = 'cash' | 'cheque' | 'bank_transfer' | 'upi' | 'online';

export interface Receipt {
  id: string;
  tenant_id: string;
  financial_year_id: string;
  receipt_number: string;
  unit_id: string;
  receipt_date: string | Date;
  amount: number;
  mode: ReceiptMode;
  reference_number: string | null;
  bank_account_id: string | null;
  narration: string;
  // Joined fields returned by the list query.
  unit_number?: string;
  owner_name?: string | null;
  created_by: string;
  created_at: Date;
}

export interface ReceiptAllocation {
  id: string;
  receipt_id: string;
  invoice_id: string;
  amount: number;
}

export type CreditNoteStatus = 'active' | 'applied' | 'expired';

export interface CreditNote {
  id: string;
  tenant_id: string;
  financial_year_id: string;
  credit_note_number: string;
  unit_id: string;
  amount: number;
  balance: number;
  reason: string;
  status: CreditNoteStatus;
  created_by: string;
  created_at: Date;
}
