'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { FormFrame, type FormMode } from '@/components/form-page';
import { FormFieldError } from '@/components/ui/form-field-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import { useLedgerAccounts } from '@/hooks/use-ledger';
import { useCreateReceipt, type CreatedReceipt } from '@/hooks/use-receipts';
import { useOpenBills, type OpenBill } from '@/hooks/use-unit-statement';
import { useUnitMembers } from '@/hooks/use-units';
import { friendlyError } from '@/lib/api-error';
import { isNotDeployed } from '@/lib/not-deployed';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  COLLECTION_MODES,
  collectionErrors,
  collectionTotal,
  emptyCollectionForm,
  needsBank,
  needsNumber,
  toCollectionPayload,
  type BillEntry,
  type CollectionForm,
  type CollectionMode,
} from './collection-state';
import { UnitPostingHeader } from './unit-posting-header';

export interface CollectionFormProps {
  unitId: string;
  mode: FormMode;
  open?: boolean;
  today: string;
  /** A bill to tick on opening ("Post amount and Collect"). */
  preselectBillId?: string | null;
  onClose: () => void;
  /** `print` when "Post and Print Receipt" was used. */
  onPosted: (receipt: CreatedReceipt, print: boolean) => void;
}

type SetForm = (patch: Partial<CollectionForm>) => void;
type Errors = Record<string, string>;

function BillsTable({ bills, form, set, errors }: { bills: OpenBill[]; form: CollectionForm; set: SetForm; errors: Errors }): ReactNode {
  const entry = (id: string): BillEntry => form.bills[id] ?? { selected: false, amount: '', tds: '' };
  const update = (id: string, patch: Partial<BillEntry>): void => set({ bills: { ...form.bills, [id]: { ...entry(id), ...patch } } });
  const allTicked = bills.length > 0 && bills.every((bill) => entry(bill.id).selected);
  const tickAll = (selected: boolean): void =>
    set({ bills: Object.fromEntries(bills.map((bill) => [bill.id, { ...entry(bill.id), selected, amount: entry(bill.id).amount || bill.remaining }])) });
  return (
    <Table aria-label="Open bills">
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
              <input type="checkbox" aria-label="Select All" disabled={form.fifo} checked={allTicked} onChange={(e) => tickAll(e.target.checked)} />
              Select All
            </label>
          </TableHead>
          <TableHead>Edit Amount</TableHead>
          <TableHead>TDS</TableHead>
        </TableRow>
      </TableHeader>
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

function PaymentFields({ form, set, errors }: { form: CollectionForm; set: SetForm; errors: Errors }): ReactNode {
  const accounts = (useLedgerAccounts({ account_type: 'asset', limit: 100 }).data?.data ?? []).filter(
    (account) => account.is_bank_account || account.code === 'cash',
  );
  return (
    <div className="space-y-3">
      <fieldset className="flex flex-wrap items-center gap-3 text-sm">
        <legend className="mb-1 font-medium">Payment mode</legend>
        {COLLECTION_MODES.map((option) => (
          <label key={option.value} className="flex items-center gap-1">
            <input type="radio" name="collection-mode" value={option.value} checked={form.mode === option.value} onChange={() => set({ mode: option.value as CollectionMode })} />
            {option.label}
          </label>
        ))}
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-3">
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
            <div className="space-y-1">
              <Label htmlFor="col-instrument-date">Instrument date</Label>
              <Input id="col-instrument-date" type="date" value={form.instrumentDate} onChange={(e) => set({ instrumentDate: e.target.value })} />
            </div>
          </>
        )}
        <div className="space-y-1">
          <Label htmlFor="col-account">Bank & Cash Account</Label>
          <Select id="col-account" value={form.bankAccountId} onChange={(e) => set({ bankAccountId: e.target.value })}>
            <option value="">Default for the mode</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="col-date">Date</Label>
          <Input id="col-date" type="date" value={form.date} onChange={(e) => set({ date: e.target.value })} />
          <FormFieldError message={errors.date} />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="col-comments">Comments</Label>
        <Textarea id="col-comments" maxLength={1000} value={form.comments} onChange={(e) => set({ comments: e.target.value })} />
      </div>
    </div>
  );
}

function PayerField({ unitId, form, set, error }: { unitId: string; form: CollectionForm; set: SetForm; error?: string }): ReactNode {
  const members = (useUnitMembers(unitId).data ?? []).filter((member) => member.member_type === 'owner' || member.member_type === 'tenant');
  return (
    <div className="max-w-sm space-y-1">
      <Label htmlFor="col-payer">Payer</Label>
      <Select id="col-payer" value={form.payerMemberId} onChange={(e) => set({ payerMemberId: e.target.value })}>
        <option value="">Pick the payer</option>
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

/** INC-26 — Post Collection for a unit (INC-S21): against the bills it pays, with cheque / DD details and TDS. */
export function CollectionFormView({ unitId, mode, open, today, preselectBillId = null, onClose, onPosted }: CollectionFormProps): ReactNode {
  const { addToast } = useToast();
  const [form, setForm] = useState<CollectionForm>(() => emptyCollectionForm(today, preselectBillId));
  const [submitted, setSubmitted] = useState(false);
  const bills = useOpenBills(unitId, 'member').data ?? [];
  const create = useCreateReceipt();
  const set: SetForm = (patch) => setForm((current) => ({ ...current, ...patch }));
  const errors = useMemo(() => collectionErrors(form, bills), [form, bills]);
  const shown = submitted ? errors : {};
  const preselected = bills.find((bill) => bill.id === preselectBillId);
  // A bill ticked on opening ("Post amount and Collect") is paid in full unless edited.
  useEffect(() => {
    if (!preselected) return;
    setForm((current) => {
      const entry = current.bills[preselected.id];
      if (!entry || entry.amount !== '') return current;
      return { ...current, bills: { ...current.bills, [preselected.id]: { ...entry, amount: preselected.remaining } } };
    });
  }, [preselected]);

  function post(print: boolean): void {
    setSubmitted(true);
    if (Object.keys(errors).length > 0) return;
    create.mutate(toCollectionPayload(unitId, form, bills), {
      onSuccess: (response) => {
        addToast({ title: `${response.data.receipt_number} posted`, description: `${formatCurrency(collectionTotal(form, bills))} received.`, variant: 'success' });
        onPosted(response.data, print);
      },
      onError: (error) => {
        const description = isNotDeployed(error) ? 'Post Collection is not available yet on this server.' : friendlyError(error);
        addToast({ title: 'Could not post the collection', description, variant: 'destructive' });
      },
    });
  }

  return (
    <FormFrame
      mode={mode}
      open={open}
      title="Post Collection"
      onClose={onClose}
      onSave={() => post(false)}
      secondaryAction={{ label: 'Post and Print Receipt', onClick: () => post(true) }}
      saving={create.isPending}
      saveLabel="Post amount"
      savingLabel="Posting…"
      dialogClassName="max-w-5xl"
    >
      <UnitPostingHeader unitId={unitId} />
      <PayerField unitId={unitId} form={form} set={set} error={shown.payerMemberId} />
      {bills.length > 0 ? (
        <>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.fifo} onChange={(e) => set({ fifo: e.target.checked })} />
            Any Invoice on FiFo Basis
          </label>
          <BillsTable bills={bills} form={form} set={set} errors={shown} />
          <FormFieldError message={shown.bills} />
        </>
      ) : (
        <p className="text-sm text-muted-foreground">No open bills — the amount will be held as an advance.</p>
      )}
      {(form.fifo || bills.length === 0) && (
        <div className="max-w-xs space-y-1">
          <Label htmlFor="col-amount">Amount</Label>
          <Input id="col-amount" inputMode="decimal" value={form.amount} onChange={(e) => set({ amount: e.target.value })} />
          <FormFieldError message={shown.amount} />
        </div>
      )}
      <PaymentFields form={form} set={set} errors={shown} />
      <p className="text-sm font-medium">Receipt total {formatCurrency(collectionTotal(form, bills))}</p>
    </FormFrame>
  );
}
