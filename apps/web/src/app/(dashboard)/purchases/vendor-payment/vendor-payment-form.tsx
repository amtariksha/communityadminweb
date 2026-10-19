'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { FormFrame, type FormMode } from '@/components/form-page';
import { useToast } from '@/components/ui/toast';
import { useLedgerAccounts, useVendor } from '@/hooks';
import { useInvoiceHeads } from '@/hooks/use-vendor-bills';
import { useCreateVendorPayment, useVendorOpenItems, type PostedVendorPayment } from '@/hooks/use-vendor-payments';
import { friendlyError } from '@/lib/api-error';
import { todayIST } from '@/lib/date';
import { formatCurrency } from '@/lib/utils';
import { DebitNoteDialog } from '../debit-note-dialog';
import { OpenInvoicesTable } from './open-invoices-table';
import { PaymentDetailsFields, type LedgerChoice } from './payment-details-fields';
import { amountPaid, paymentIssue, tickRow, toPaymentInput, type PayMode, type PaymentDetails, type PayRow } from './payment-model';

export interface VendorPaymentFormProps {
  mode: FormMode;
  vendorId: string;
  /** An invoice to tick when the form opens (the Pay button on a bill row). */
  initialBillId?: string;
  open?: boolean;
  onClose: () => void;
  onSaved: (payment: PostedVendorPayment) => void;
}

function blankDetails(): PaymentDetails {
  const today = todayIST();
  return {
    paymentDate: today, bankLedgerId: '', paymentMode: 'bank_transfer', instrumentNo: '', instrumentDate: today,
    writeOff: '', writeOffAccountId: '', tds: '', notes: '', amount: '', expenseHead: '',
  };
}

/** Bank ledgers and Cash in Hand; income ledgers with "discount received" first. */
function useLedgerChoices(): { paidFrom: LedgerChoice[]; writeOff: LedgerChoice[] } {
  const assets = useLedgerAccounts({ account_type: ['asset'], limit: 200 }).data?.data ?? [];
  const income = useLedgerAccounts({ account_type: ['income'], limit: 200 }).data?.data ?? [];
  return useMemo(() => {
    const label = (a: { code: string; name: string }): string => (a.code ? `${a.code} ${a.name}` : a.name);
    const discountFirst = [...income].sort((a, b) => Number(/discount received/i.test(b.name)) - Number(/discount received/i.test(a.name)));
    return {
      paidFrom: assets.filter((a) => a.is_bank_account || a.code === 'cash').map((a) => ({ id: a.id, label: label(a) })),
      writeOff: discountFirst.map((a) => ({ id: a.id, label: label(a) })),
    };
  }, [assets, income]);
}

const LINKS: ReadonlyArray<[PayMode, string]> = [['without_invoice', 'Post payment without invoice'], ['advance', 'Post advance payment']];

/**
 * Pay a vendor (EXP-14, screen EXP-S9): open invoices with Select All and
 * Edit Amount, payment details, and the links for a payment without
 * invoice, an advance and a debit note in advance. Amount paid = Σ edited
 * amounts − TDS at payment, shown as it changes.
 */
export function VendorPaymentForm(props: VendorPaymentFormProps): ReactNode {
  const { addToast } = useToast();
  const [payMode, setPayMode] = useState<PayMode>('invoices');
  const [rows, setRows] = useState<Record<string, PayRow>>({});
  const [details, setDetails] = useState<PaymentDetails>(blankDetails);
  const [touched, setTouched] = useState(false);
  const [debitNoteOpen, setDebitNoteOpen] = useState(false);
  const vendor = useVendor(props.vendorId);
  const openItems = useVendorOpenItems(props.vendorId);
  const heads = useInvoiceHeads().data?.data ?? [];
  const choices = useLedgerChoices();
  const create = useCreateVendorPayment();
  const bills = useMemo(() => openItems.data?.bills ?? [], [openItems.data]);

  useEffect(() => {
    const bill = bills.find((b) => b.id === props.initialBillId);
    if (bill) setRows((current) => (current[bill.id] ? current : { ...current, [bill.id]: tickRow(bill, true) }));
  }, [bills, props.initialBillId]);

  const issue = paymentIssue(payMode, bills, rows, details);
  const patch = (next: Partial<PaymentDetails>): void => setDetails((d) => ({ ...d, ...next }));

  function save(): void {
    setTouched(true);
    if (issue) return;
    create.mutate(toPaymentInput(props.vendorId, payMode, bills, rows, details), {
      onSuccess(posted) {
        addToast({ title: `Payment ${posted.payment.voucher_number} posted`, variant: 'success' });
        props.onSaved(posted);
      },
      onError(error) {
        addToast({ title: 'Could not post the payment', description: friendlyError(error), variant: 'destructive' });
      },
    });
  }

  const title = payMode === 'advance' ? 'Post advance payment' : payMode === 'without_invoice' ? 'Post payment without invoice' : 'Pay vendor';
  return (
    <>
    <FormFrame mode={props.mode} open={props.open} title={`${title} — ${vendor.data?.name ?? ''}`} saveLabel="Post Payment" savingLabel="Posting…" saving={create.isPending} onSave={save} onClose={props.onClose} dialogClassName="max-w-5xl">
      {openItems.data === null ? (
        <p className="text-sm text-muted-foreground">Paying against several invoices is not available yet on this server.</p>
      ) : (
        <>
          {payMode === 'invoices' && <OpenInvoicesTable bills={bills} rows={rows} onChange={setRows} />}
          <PaymentDetailsFields mode={payMode} details={details} onChange={patch} paidFrom={choices.paidFrom} writeOffAccounts={choices.writeOff} expenseHeads={heads.map((h) => ({ id: h.ledger_account_id, label: h.code ? `${h.code} ${h.name}` : h.name }))} />
          {payMode === 'invoices' && <p className="text-sm font-medium" data-testid="amount-paid">Amount paid: {formatCurrency(amountPaid(bills, rows, details.tds) / 100)}</p>}
          <nav className="flex flex-wrap gap-4 text-sm" aria-label="Other kinds of payment">
            <Link className="text-primary underline" href={`/expense-tracker/by-vendors/${props.vendorId}/invoice`}>Enter an invoice here</Link>
            {payMode !== 'invoices' && <button type="button" className="text-primary underline" onClick={() => setPayMode('invoices')}>Pay against invoices</button>}
            {LINKS.filter(([m]) => m !== payMode).map(([m, text]) => (
              <button key={m} type="button" className="text-primary underline" onClick={() => setPayMode(m)}>{text}</button>
            ))}
            <button type="button" className="text-primary underline" onClick={() => setDebitNoteOpen(true)}>Post debit note in advance</button>
          </nav>
          {touched && issue && <p role="alert" className="text-sm text-destructive">{issue}</p>}
        </>
      )}
    </FormFrame>
    <DebitNoteDialog open={debitNoteOpen} onOpenChange={setDebitNoteOpen} vendorId={props.vendorId} />
    </>
  );
}
