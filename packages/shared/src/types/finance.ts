export type AccountType = 'asset' | 'liability' | 'income' | 'expense' | 'equity';
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
  // EXP-19 — HSN/SAC default for lines on this head.
  hsn_sac?: string | null;
  is_system: boolean;
  is_active: boolean;
  created_at: string | Date;
  // Computed field returned by list endpoints.
  current_balance?: number;
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
  /** What the API returns: 'none' (no GST) or the rule GST is charged by. */
  gst_rule?: 'none' | 'inclusive' | 'exclusive' | 'full' | 'above_limit';
  /** DECIMAL on the wire, so usually a string. */
  gst_percentage?: number | string;
  /** @deprecated The API does not send this; read `gst_rule` (see lib/invoice-rule.ts). */
  is_gst_applicable?: boolean;
  /** @deprecated The API does not send this; read `gst_percentage`. */
  gst_rate?: number;
  is_active: boolean;
  created_at: Date;
}

export type InvoiceStatus = 'draft' | 'sent' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';

/** The ledger an invoice belongs to (INC-14): member, utility or non-member income. */
export type InvoiceIncomeScope = 'member' | 'utility' | 'non_member';

export interface Invoice {
  id: string;
  tenant_id: string;
  financial_year_id: string;
  invoice_number: string;
  /** Null on an invoice raised to a non-member payer (see `customer_id`). */
  unit_id: string | null;
  customer_id?: string | null;
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
  /** Absent on an API older than INC-14. */
  income_scope?: InvoiceIncomeScope;
  created_at: string | Date;
  // Joined fields returned by the list query.
  unit_number?: string | null;
  block?: string | null;
  owner_name?: string | null;
  owner_phone?: string | null;
  tenant_name?: string | null;
  /** The non-member payer's name, when the invoice was raised to one. */
  customer_name?: string | null;
  customer_legal_name?: string | null;
  customer_gstin?: string | null;
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

export type ReceiptMode = 'cash' | 'cheque' | 'bank_transfer' | 'upi' | 'online' | 'dd';

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
  /** The column the API stores the mode in (`mode` is the request-side name). */
  payment_mode?: ReceiptMode;
  /** INC-27 — set once the receipt is voided. Absent on an API older than INC-27. */
  voided_at?: string | Date | null;
  void_reason?: string | null;
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
