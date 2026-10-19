'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { FormFrame } from '@/components/form-page';
import { AccountSearchSelect } from '@/components/ui/account-search-select';
import { FormFieldError } from '@/components/ui/form-field-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import { usePostUnitCreditNote, type PostedUnitCreditNote } from '@/hooks/use-unit-posting';
import { useOpenBills, type OpenBill } from '@/hooks/use-unit-statement';
import { useUnitMembers } from '@/hooks/use-units';
import { friendlyError } from '@/lib/api-error';
import { isNotDeployed } from '@/lib/not-deployed';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  CREDIT_NOTE_TITLES,
  creditNoteErrors,
  emptyCreditNoteForm,
  toCreditNotePayload,
  type CreditNoteForm,
  type CreditNotePage,
} from './credit-note-state';
import { UnitPostingHeader } from './unit-posting-header';

interface CreditNoteFormProps {
  unitId: string;
  page: CreditNotePage;
  today: string;
  onClose: () => void;
  onPosted: (note: PostedUnitCreditNote) => void;
}

type SetForm = (patch: Partial<CreditNoteForm>) => void;

function PayerSelect({ unitId, value, onChange, error }: { unitId: string; value: string; onChange: (id: string) => void; error?: string }): ReactNode {
  const members = (useUnitMembers(unitId).data ?? []).filter((member) => member.member_type === 'owner' || member.member_type === 'tenant');
  return (
    <div className="space-y-1">
      <Label htmlFor="cn-payer">Payer</Label>
      <Select id="cn-payer" value={value} onChange={(e) => onChange(e.target.value)}>
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

function BillTable({ bills, form, set, errors }: { bills: OpenBill[]; form: CreditNoteForm; set: SetForm; errors: Record<string, string> }): ReactNode {
  const update = (id: string, patch: Partial<{ selected: boolean; amount: string }>): void =>
    set({ bills: { ...form.bills, [id]: { ...(form.bills[id] ?? { selected: false, amount: '' }), ...patch } } });
  if (bills.length === 0) return <p className="text-sm text-muted-foreground">This unit has no open bills.</p>;
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
          <TableHead>Select</TableHead>
          <TableHead>Edit Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {bills.map((bill) => {
          const entry = form.bills[bill.id];
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
                  checked={entry?.selected ?? false}
                  onChange={(e) => update(bill.id, { selected: e.target.checked, amount: entry?.amount || bill.remaining })}
                />
              </TableCell>
              <TableCell className="w-32">
                <Input aria-label={`Amount for ${bill.invoice_number}`} inputMode="decimal" disabled={!entry?.selected} value={entry?.amount ?? ''} onChange={(e) => update(bill.id, { amount: e.target.value })} />
                <FormFieldError message={errors[`bill.${bill.id}`]} />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function AmountFields({ page, form, set, errors }: { page: CreditNotePage; form: CreditNoteForm; set: SetForm; errors: Record<string, string> }): ReactNode {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1">
        <Label htmlFor="cn-amount">Amount</Label>
        <Input id="cn-amount" inputMode="decimal" value={form.amount} onChange={(e) => set({ amount: e.target.value })} />
        <FormFieldError message={errors.amount} />
      </div>
      {page === 'general' ? (
        <div className="space-y-1">
          <Label>Account</Label>
          <p className="py-2 text-sm">Credit Note</p>
        </div>
      ) : (
        <div className="space-y-1">
          <Label>Account</Label>
          <AccountSearchSelect value={form.ledgerAccountId} onChange={(id) => set({ ledgerAccountId: id })} accountType={['income']} placeholder="Search income accounts" />
          <FormFieldError message={errors.ledgerAccountId} />
        </div>
      )}
    </div>
  );
}

/**
 * INC-25 — credit notes from the unit (INC-S20): general (the account as a
 * whole), account specific (one income account) or specific (chosen bills).
 * Never edits an invoice; the note's allocations lower the bills.
 */
export function CreditNoteFormPage({ unitId, page, today, onClose, onPosted }: CreditNoteFormProps): ReactNode {
  const { addToast } = useToast();
  const [form, setForm] = useState<CreditNoteForm>(() => emptyCreditNoteForm(today));
  const [submitted, setSubmitted] = useState(false);
  const bills = useOpenBills(unitId, 'member', { enabled: page === 'specific' }).data ?? [];
  const post = usePostUnitCreditNote();
  const set: SetForm = (patch) => setForm((current) => ({ ...current, ...patch }));
  const errors = useMemo(() => creditNoteErrors(page, form, bills), [page, form, bills]);
  const shown = submitted ? errors : {};

  function save(): void {
    setSubmitted(true);
    if (Object.keys(errors).length > 0) return;
    post.mutate(toCreditNotePayload(unitId, page, form, bills), {
      onSuccess: (response) => {
        const note = response.data;
        const held = note.advance > 0 ? `; ${formatCurrency(note.advance)} held as an advance` : '';
        addToast({ title: `${note.credit_note_number} posted`, description: `${formatCurrency(Number(note.amount))} credited${held}.`, variant: 'success' });
        onPosted(note);
      },
      onError: (error) => {
        const description = isNotDeployed(error) ? 'Credit notes from the unit are not available yet on this server.' : friendlyError(error);
        addToast({ title: 'Could not post the credit note', description, variant: 'destructive' });
      },
    });
  }

  return (
    <FormFrame mode="page" title={CREDIT_NOTE_TITLES[page]} onClose={onClose} onSave={save} saving={post.isPending} saveLabel="Post Credit Note" savingLabel="Posting…">
      <UnitPostingHeader unitId={unitId} />
      {page === 'specific' ? (
        <>
          <PayerSelect unitId={unitId} value={form.payerMemberId} onChange={(id) => set({ payerMemberId: id })} error={shown.payerMemberId} />
          <BillTable bills={bills} form={form} set={set} errors={shown} />
          <FormFieldError message={shown.bills} />
        </>
      ) : (
        <AmountFields page={page} form={form} set={set} errors={shown} />
      )}
      <div className="space-y-1">
        <Label htmlFor="cn-reason">Comments</Label>
        <Textarea id="cn-reason" value={form.reason} maxLength={1000} onChange={(e) => set({ reason: e.target.value })} />
        <FormFieldError message={shown.reason} />
      </div>
      <div className="max-w-xs space-y-1">
        <Label htmlFor="cn-date">Date</Label>
        <Input id="cn-date" type="date" value={form.date} onChange={(e) => set({ date: e.target.value })} />
        <FormFieldError message={shown.date} />
      </div>
    </FormFrame>
  );
}
