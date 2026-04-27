export interface Vendor {
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
  // FK to the vendor's payable ledger under Sundry Creditors (created
  // automatically on vendor.create per migration 059). Null for
  // vendors created before that migration ran.
  ledger_account_id?: string | null;
  // TDS classification — used by the bill-conversion dialog to pull
  // the right section rule from the resolved TDS config.
  tds_section?: string | null;
  tds_rate?: number | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export type PurchaseRequestStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'completed' | 'cancelled';

export interface PurchaseRequest {
  id: string;
  tenant_id: string;
  financial_year_id: string;
  pr_number: string;
  title: string;
  description: string;
  estimated_amount: number;
  vendor_id: string | null;
  requested_by: string;
  status: PurchaseRequestStatus;
  created_at: Date;
  updated_at: Date;
}

export type PrApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface PrApproval {
  id: string;
  purchase_request_id: string;
  approver_id: string;
  status: PrApprovalStatus;
  remarks: string | null;
  acted_at: Date | null;
}

export type VendorBillStatus = 'draft' | 'pending_approval' | 'approved' | 'partially_paid' | 'paid' | 'cancelled';

export interface VendorBill {
  id: string;
  tenant_id: string;
  financial_year_id: string;
  bill_number: string;
  vendor_id: string;
  purchase_request_id: string | null;
  bill_date: Date;
  due_date: Date;
  total_amount: number;
  paid_amount: number;
  balance_due: number;
  status: VendorBillStatus;
  narration: string;
  created_at: Date;
}

export type VendorPaymentMode = 'cash' | 'cheque' | 'bank_transfer' | 'upi';

export interface VendorPayment {
  id: string;
  tenant_id: string;
  financial_year_id: string;
  vendor_bill_id: string;
  payment_date: Date;
  amount: number;
  mode: VendorPaymentMode;
  reference_number: string | null;
  bank_account_id: string | null;
  narration: string;
  created_by: string;
  created_at: Date;
}
