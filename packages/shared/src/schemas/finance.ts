import { z } from 'zod';

export const createAccountGroupSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  type: z.enum(['asset', 'liability', 'income', 'expense']),
  parent_id: z.string().uuid().nullable(),
  code: z.string().min(1, 'Code is required').max(20),
  sort_order: z.number().int().nonnegative().default(0),
});

export type CreateAccountGroupInput = z.infer<typeof createAccountGroupSchema>;

export const createLedgerAccountSchema = z.object({
  group_id: z.string().uuid('Group ID must be a valid UUID'),
  name: z.string().min(1, 'Name is required').max(255),
  code: z.string().min(1, 'Code is required').max(20),
  opening_balance: z.number().default(0),
  balance_type: z.enum(['debit', 'credit']).default('debit'),
  is_bank_account: z.boolean().default(false),
  bank_details: z.record(z.unknown()).nullable().default(null),
});

export type CreateLedgerAccountInput = z.infer<typeof createLedgerAccountSchema>;

const journalLineSchema = z.object({
  ledger_account_id: z.string().uuid('Ledger account ID must be a valid UUID'),
  debit: z.number().nonnegative().default(0),
  credit: z.number().nonnegative().default(0),
});

export const createJournalEntrySchema = z
  .object({
    financial_year_id: z.string().uuid('Financial year ID must be a valid UUID'),
    entry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
    narration: z.string().min(1, 'Narration is required').max(1000),
    source_type: z.string().max(50).default('manual'),
    source_id: z.string().uuid().nullable().default(null),
    lines: z
      .array(journalLineSchema)
      .min(2, 'Journal entry must have at least two lines'),
  })
  .refine(
    function checkBalance(data) {
      const totalDebit = data.lines.reduce(function sum(acc, line) {
        return acc + line.debit;
      }, 0);
      const totalCredit = data.lines.reduce(function sum(acc, line) {
        return acc + line.credit;
      }, 0);
      return Math.abs(totalDebit - totalCredit) < 0.01;
    },
    { message: 'Total debits must equal total credits', path: ['lines'] },
  );

export type CreateJournalEntryInput = z.infer<typeof createJournalEntrySchema>;

const invoiceLineSchema = z.object({
  ledger_account_id: z.string().uuid('Ledger account ID must be a valid UUID'),
  description: z.string().min(1, 'Description is required').max(500),
  amount: z.number().positive('Amount must be positive'),
  gst_rate: z.number().nonnegative().default(0),
});

export const createInvoiceSchema = z.object({
  financial_year_id: z.string().uuid('Financial year ID must be a valid UUID'),
  unit_id: z.string().uuid('Unit ID must be a valid UUID'),
  invoice_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  lines: z.array(invoiceLineSchema).min(1, 'Invoice must have at least one line'),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;

const receiptAllocationSchema = z.object({
  invoice_id: z.string().uuid('Invoice ID must be a valid UUID'),
  amount: z.number().positive('Allocation amount must be positive'),
});

export const createReceiptSchema = z.object({
  financial_year_id: z.string().uuid('Financial year ID must be a valid UUID'),
  unit_id: z.string().uuid('Unit ID must be a valid UUID'),
  receipt_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  amount: z.number().positive('Amount must be positive'),
  mode: z.enum(['cash', 'cheque', 'bank_transfer', 'upi', 'online']),
  reference_number: z.string().max(100).nullable().default(null),
  bank_account_id: z.string().uuid().nullable().default(null),
  narration: z.string().max(1000).default(''),
  allocations: z.array(receiptAllocationSchema).default([]),
});

export type CreateReceiptInput = z.infer<typeof createReceiptSchema>;
