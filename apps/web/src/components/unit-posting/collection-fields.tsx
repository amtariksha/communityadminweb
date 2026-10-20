'use client';

import { type ReactNode } from 'react';
import { FormFieldError } from '@/components/ui/form-field-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useLedgerAccounts } from '@/hooks/use-ledger';
import { useUnitMembers } from '@/hooks/use-units';
import type { OpenBill } from '@/hooks/use-unit-statement';
import { formatCurrency, formatDate } from '@/lib/utils';
import { COLLECTION_MODES, needsBank, needsNumber, type BillEntry, type CollectionForm, type CollectionMode } from './collection-state';

/**
 * The open-bills table and the payment block of Post Collection (INC-S21),
 * shared by a unit's collection (INC-26) and a non-member payer's (INC-45).
 */
export type SetCollectionForm = (patch: Partial<CollectionForm>) => void;
type Errors = Record<string, string>;

interface BillsTableProps {
  bills: readonly OpenBill[];
  form: CollectionForm;
  set: SetCollectionForm;
  errors: Errors;
}

function BillsHeader({ disabled, allTicked, onTickAll }: { disabled: boolean; allTicked: boolean; onTickAll: (selected: boolean) => void }): ReactNode {
  return (
    <TableHeader>
      <TableRow>
        <TableHead>Bill No</TableHead>
        <TableHead>Bill Date</TableHead>
        <TableHead>Bill Due Date</TableHead>
        <TableHead>Account</TableHead>
        <TableHead>Bill Details</TableHead>
        <TableHead className="text-right">Bill Amount</TableHead>
        <TableHead className="text-right">Remaining Amount</TableHead>
        <TableHead>
          <label className="flex items-center gap-1">
            <input type="checkbox" aria-label="Select All" disabled={disabled} checked={allTicked} onChange={(e) => onTickAll(e.target.checked)} />
            Select All
          </label>
        </TableHead>
        <TableHead>Edit Amount</TableHead>
        <TableHead>TDS</TableHead>
      </TableRow>
    </TableHeader>
  );
}

export function BillsTable({ bills, form, set, errors }: BillsTableProps): ReactNode {
  const entry = (id: string): BillEntry => form.bills[id] ?? { selected: false, amount: '', tds: '' };
  const update = (id: string, patch: Partial<BillEntry>): void => set({ bills: { ...form.bills, [id]: { ...entry(id), ...patch } } });
  const allTicked = bills.length > 0 && bills.every((bill) => entry(bill.id).selected);
  const tickAll = (selected: boolean): void =>
    set({ bills: Object.fromEntries(bills.map((bill) => [bill.id, { ...entry(bill.id), selected, amount: entry(bill.id).amount || bill.remaining }])) });
  return (
    <Table aria-label="Open bills">
      <BillsHeader disabled={form.fifo} allTicked={allTicked} onTickAll={tickAll} />
      <TableBody>
        {bills.map((bill) => {
          const row = entry(bill.id);
          const off = form.fifo || !row.selected;
          return (
            <TableRow key={bill.id}>
              <TableCell className="font-mono text-xs">{bill.invoice_number}</TableCell>
              <TableCell>{formatDate(bill.bill_date)}</TableCell>
              <TableCell>{formatDate(bill.due_date)}</TableCell>
              <TableCell>{bill.account}</TableCell>
              <TableCell>{bill.details}</TableCell>
              <TableCell className="text-right">{formatCurrency(Number(bill.bill_amount))}</TableCell>
              <TableCell className="text-right">{formatCurrency(Number(bill.remaining))}</TableCell>
              <TableCell>
                <input
                  type="checkbox"
                  aria-label={`Select ${bill.invoice_number}`}
                  disabled={form.fifo}
                  checked={row.selected}
                  onChange={(e) => update(bill.id, { selected: e.target.checked, amount: row.amount || bill.remaining })}
                />
              </TableCell>
              <TableCell className="w-32">
                <Input aria-label={`Amount for ${bill.invoice_number}`} inputMode="decimal" disabled={off} value={row.amount} onChange={(e) => update(bill.id, { amount: e.target.value })} />
                <FormFieldError message={errors[`bill.${bill.id}`]} />
              </TableCell>
              <TableCell className="w-28">
                <Input aria-label={`TDS for ${bill.invoice_number}`} inputMode="decimal" disabled={off} value={row.tds} onChange={(e) => update(bill.id, { tds: e.target.value })} />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function ModeRadios({ form, set }: { form: CollectionForm; set: SetCollectionForm }): ReactNode {
  return (
    <fieldset className="flex flex-wrap items-center gap-3 text-sm">
      <legend className="mb-1 font-medium">Payment mode</legend>
      {COLLECTION_MODES.map((option) => (
        <label key={option.value} className="flex items-center gap-1">
          <input type="radio" name="collection-mode" value={option.value} checked={form.mode === option.value} onChange={() => set({ mode: option.value as CollectionMode })} />
          {option.label}
        </label>
      ))}
    </fieldset>
  );
}

function InstrumentFields({ form, set, errors, instrumentDate }: { form: CollectionForm; set: SetCollectionForm; errors: Errors; instrumentDate: boolean }): ReactNode {
  return (
    <>
      {needsNumber(form.mode) && (
        <div className="space-y-1">
          <Label htmlFor="col-reference">Payment Number</Label>
          <Input id="col-reference" maxLength={100} value={form.reference} onChange={(e) => set({ reference: e.target.value })} />
          <FormFieldError message={errors.reference} />
        </div>
      )}
      {needsBank(form.mode) && (
        <>
          <div className="space-y-1">
            <Label htmlFor="col-bank">Payment Bank</Label>
            <Input id="col-bank" maxLength={100} value={form.bank} onChange={(e) => set({ bank: e.target.value })} />
            <FormFieldError message={errors.bank} />
          </div>
          {instrumentDate && (
            <div className="space-y-1">
              <Label htmlFor="col-instrument-date">Instrument date</Label>
              <Input id="col-instrument-date" type="date" value={form.instrumentDate} onChange={(e) => set({ instrumentDate: e.target.value })} />
            </div>
          )}
        </>
      )}
    </>
  );
}

/** The active bank and cash ledgers; empty = the default ledger for the mode. */
export function BankAccountSelect({ id, value, onChange }: { id: string; value: string; onChange: (accountId: string) => void }): ReactNode {
  const accounts = (useLedgerAccounts({ account_type: 'asset', limit: 100 }).data?.data ?? []).filter(
    (account) => account.is_bank_account || account.code === 'cash',
  );
  return (
    <Select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Default for the mode</option>
      {accounts.map((account) => (
        <option key={account.id} value={account.id}>
          {account.name}
        </option>
      ))}
    </Select>
  );
}

/** Who paid: a current owner or tenant of the unit. */
export function MemberPayerField({ unitId, form, set, error, optional = false }: {
  unitId: string;
  form: CollectionForm;
  set: SetCollectionForm;
  error?: string;
  optional?: boolean;
}): ReactNode {
  const members = (useUnitMembers(unitId).data ?? []).filter((member) => member.member_type === 'owner' || member.member_type === 'tenant');
  return (
    <div className="max-w-sm space-y-1">
      <Label htmlFor="col-payer">Payer</Label>
      <Select id="col-payer" value={form.payerMemberId} onChange={(e) => set({ payerMemberId: e.target.value })}>
        <option value="">{optional ? 'Not given' : 'Pick the payer'}</option>
        {members.map((member) => (
          <option key={member.id} value={member.id}>
            {(member.name ?? (member as { user_name?: string }).user_name ?? 'Member') + ` (${member.member_type})`}
          </option>
        ))}
      </Select>
      <FormFieldError message={error} />
    </div>
  );
}

/** Payment mode, number, bank, the Bank & Cash ledger, the date and comments. */
export function PaymentFields({ form, set, errors, commentsLabel = 'Comments', instrumentDate = true }: {
  form: CollectionForm;
  set: SetCollectionForm;
  errors: Errors;
  commentsLabel?: string;
  /** The cheque / DD date; off where the route does not keep it. */
  instrumentDate?: boolean;
}): ReactNode {
  return (
    <div className="space-y-3">
      <ModeRadios form={form} set={set} />
      <div className="grid gap-3 sm:grid-cols-3">
        <InstrumentFields form={form} set={set} errors={errors} instrumentDate={instrumentDate} />
        <div className="space-y-1">
          <Label htmlFor="col-account">Bank & Cash Account</Label>
          <BankAccountSelect id="col-account" value={form.bankAccountId} onChange={(bankAccountId) => set({ bankAccountId })} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="col-date">Date</Label>
          <Input id="col-date" type="date" value={form.date} onChange={(e) => set({ date: e.target.value })} />
          <FormFieldError message={errors.date} />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="col-comments">{commentsLabel}</Label>
        <Textarea id="col-comments" maxLength={1000} value={form.comments} onChange={(e) => set({ comments: e.target.value })} />
      </div>
    </div>
  );
}
