'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

/**
 * Income registers (INC-44 filters, INC-36 fetch boxes): invoices, receipts
 * and credit notes found by number range, date, account, unsent and voided.
 * Each row type carries a field only the INC-44 API sends (`marker`), so a
 * screen can tell an older server that ignored the filters.
 */

export interface InvoiceRegisterRow {
  id: string;
  invoice_number: string;
  invoice_date: string;
  unit_id: string | null;
  unit_number: string | null;
  block: string | null;
  customer_name: string | null;
  billing_period: string | null;
  period_from: string | null;
  period_to: string | null;
  /** INC-44 marker: absent on an older API. */
  account_names?: string | null;
  subtotal: string | number;
  gst_amount: string | number;
  total_amount: string | number;
  amount_paid: string | number;
  balance_due: string | number;
  status: string;
  document_type?: string;
  email_status?: string | null;
}

export interface ReceiptRegisterRow {
  id: string;
  receipt_number: string;
  receipt_date: string;
  unit_id: string | null;
  unit_number: string | null;
  block?: string | null;
  customer_name?: string | null;
  income_account_name?: string | null;
  payer_name?: string | null;
  payment_mode: string;
  reference_number: string | null;
  /** INC-44 marker: absent on an older API. */
  bank_account_name?: string | null;
  amount: string | number;
  voided_at?: string | null;
  allocated_invoices?: Array<{ invoice_id: string; invoice_number: string; amount: number }>;
  email_status?: string | null;
}

export interface CreditNoteRegisterRow {
  id: string;
  credit_note_number: string;
  credit_note_date?: string | null;
  created_at: string;
  unit_number: string | null;
  block?: string | null;
  customer_name?: string | null;
  kind?: string | null;
  /** INC-44 marker: absent on an older API. */
  against_bills?: string | null;
  account_name?: string | null;
  amount: string | number;
  reason: string;
  email_status?: string | null;
}

export type RegisterKind = 'invoices' | 'receipts' | 'credit-notes';

export const REGISTER_PATHS: Record<RegisterKind, { list: string; export: string; marker: string }> = {
  invoices: { list: '/invoices', export: '/invoices/export', marker: 'account_names' },
  receipts: { list: '/receipts', export: '/receipts/export', marker: 'bank_account_name' },
  'credit-notes': { list: '/receipts/credit-notes', export: '/receipts/credit-notes/export', marker: 'against_bills' },
};

export const registerKeys = {
  all: ['income-registers'] as const,
  list: (kind: RegisterKind, params: Record<string, string>) => [...registerKeys.all, kind, params] as const,
};

/**
 * True when the rows came from an API older than INC-44: it ignores the
 * register filters, so the list is not what was asked for.
 */
export function registerFiltersIgnored(kind: RegisterKind, rows: ReadonlyArray<object>): boolean {
  const marker = REGISTER_PATHS[kind].marker;
  return rows.length > 0 && rows.every((row) => !(marker in row));
}

/** One page of a register; `enabled` is false until the box's first Fetch. */
export function useIncomeRegister<Row>(kind: RegisterKind, params: Record<string, string>, enabled: boolean) {
  return useQuery({
    queryKey: registerKeys.list(kind, params),
    enabled,
    meta: { suppressToast: true },
    retry: false,
    queryFn: function fetchRegister() {
      return api.get<{ data: Row[]; total: number }>(REGISTER_PATHS[kind].list, { params });
    },
  });
}
