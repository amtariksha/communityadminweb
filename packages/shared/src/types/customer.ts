export interface Customer {
  id: string;
  tenant_id: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  gstin: string | null;
  pan: string | null;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_ifsc: string | null;
  // FK to the customer's receivable ledger under Sundry Debtors. The
  // backend creates this on customer.create and keeps the ledger
  // name in sync on update — see migration 070 +
  // customer.service.ts. Null for legacy imports that landed via
  // Tally before this column existed.
  ledger_account_id: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CustomerWithOutstanding extends Customer {
  total_outstanding: number;
  total_invoices: number;
  pending_invoices: number;
}
