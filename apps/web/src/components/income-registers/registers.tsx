'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { useLedgerAccounts } from '@/hooks/use-ledger';
import type { CreditNoteRegisterRow, InvoiceRegisterRow, ReceiptRegisterRow } from '@/hooks/use-income-registers';
import { canWriteFinance } from '@/lib/finance-roles';
import { invoiceColumns } from './invoice-columns';
import { creditNoteColumns, receiptColumns } from './receipt-columns';
import { RegisterBox, type RegisterBoxExtra } from './register-box';

/**
 * Receipts & Invoices registers in the classic layout (INC-36, INC-S25…S27):
 * each page is a set of fetch boxes, and nothing loads until a box's Fetch.
 * Utility Tracker's registers are the same boxes on scope utility (UTIL-12).
 */

export interface RegisterScopeProps {
  /** Only the documents of this ledger (Utility Tracker sends utility). */
  scope?: 'member' | 'utility';
}

const scopeParams = (scope?: RegisterScopeProps['scope']): Record<string, string> => (scope ? { scope } : {});

/** Receipts & Invoices › Receipts: four boxes. */
export function ReceiptsRegister({ scope }: RegisterScopeProps = {}): ReactNode {
  const canWrite = useMemo(() => canWriteFinance(), []);
  const scoped = scopeParams(scope);
  const columns = useMemo(() => receiptColumns(canWrite), [canWrite]);
  const common = { kind: 'receipts' as const, columns, rowKey: (row: ReceiptRegisterRow) => row.id, filename: 'receipts', emptyText: 'No receipts match.' };
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Online payments appear here once the gateway confirms them.</p>
      <RegisterBox<ReceiptRegisterRow> {...common} title="Unsent Email Receipts" range="date" fixed={{ ...scoped, unsent_email: 'true', voided: 'false' }} />
      <RegisterBox<ReceiptRegisterRow> {...common} title="Receipts Posted From … To …" range="date" requireRange fixed={{ ...scoped }} />
      <RegisterBox<ReceiptRegisterRow> {...common} title="Receipts by Number From … To …" range="number" rangeLabel="Receipt No." requireRange fixed={{ ...scoped }} />
      <RegisterBox<ReceiptRegisterRow> {...common} title="Voided Receipts" range="date" fixed={{ ...scoped, voided: 'true' }} />
    </div>
  );
}

/** Receipts & Invoices › Credit Notes: two boxes. */
export function CreditNotesRegister({ scope }: RegisterScopeProps = {}): ReactNode {
  const canWrite = useMemo(() => canWriteFinance(), []);
  const scoped = scopeParams(scope);
  const columns = useMemo(() => creditNoteColumns(canWrite), [canWrite]);
  const common = { kind: 'credit-notes' as const, columns, rowKey: (row: CreditNoteRegisterRow) => row.id, filename: 'credit-notes', emptyText: 'No credit notes match.' };
  return (
    <div className="space-y-4">
      <RegisterBox<CreditNoteRegisterRow> {...common} title="Unsent Email Credit Notes" range="date" fixed={{ ...scoped, unsent_email: 'true' }} />
      <RegisterBox<CreditNoteRegisterRow> {...common} title="Credit Notes Posted From … To …" range="date" requireRange fixed={{ ...scoped }} />
    </div>
  );
}

function useIncomeAccountExtra(): RegisterBoxExtra {
  const [accountId, setAccountId] = useState('');
  const accounts = useLedgerAccounts({ account_type: 'income', limit: 500 });
  const options = accounts.data?.data ?? [];
  return {
    params: accountId ? { account_id: accountId } : {},
    error: accountId ? null : 'Choose an income account.',
    node: (
      <div className="space-y-1">
        <Label htmlFor="register-income-account">Income account</Label>
        <Select id="register-income-account" className="w-56" value={accountId} onChange={(event) => setAccountId(event.target.value)}>
          <option value="">Choose…</option>
          {options.map((account) => (
            <option key={account.id} value={account.id}>
              {account.code ? `${account.code} — ${account.name}` : account.name}
            </option>
          ))}
        </Select>
      </div>
    ),
  };
}

/** Receipts & Invoices › Invoices: five boxes (drafts never show here; they stay on the standard list). */
export function InvoicesRegister({ scope }: RegisterScopeProps = {}): ReactNode {
  const canWrite = useMemo(() => canWriteFinance(), []);
  const scoped = scopeParams(scope);
  const columns = useMemo(() => invoiceColumns(canWrite), [canWrite]);
  const accountExtra = useIncomeAccountExtra();
  const common = { kind: 'invoices' as const, columns, rowKey: (row: InvoiceRegisterRow) => row.id, filename: 'invoices', emptyText: 'No invoices match.' };
  return (
    <div className="space-y-4">
      <RegisterBox<InvoiceRegisterRow> {...common} title="Unsent Email Invoices" range="date" fixed={{ ...scoped, unsent_email: 'true', posted: 'true' }} />
      <RegisterBox<InvoiceRegisterRow> {...common} title="Invoices Posted From … To …" range="date" requireRange fixed={{ ...scoped, posted: 'true' }} />
      <RegisterBox<InvoiceRegisterRow> {...common} title="Invoices by Number From … To …" range="number" rangeLabel="Invoice No." requireRange fixed={{ ...scoped, posted: 'true' }} />
      <RegisterBox<InvoiceRegisterRow> {...common} title="Invoices by Income Account" range="date" fixed={{ ...scoped, posted: 'true' }} extra={accountExtra} />
      <RegisterBox<InvoiceRegisterRow> {...common} title="Reversed Invoices From … To …" range="date" requireRange fixed={{ ...scoped, status: 'cancelled' }} />
    </div>
  );
}
