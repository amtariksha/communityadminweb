'use client';

import { Suspense, useEffect, useState, type ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormFrame } from '@/components/form-page';
import { AccountSearchSelect } from '@/components/ui/account-search-select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { batchSummary, useInvoiceBatch, type InvoiceBatchResult } from '@/hooks/use-utility-batch';
import { useUtilitySettings } from '@/hooks/use-utility-settings';
import { friendlyError } from '@/lib/api-error';
import { isNotDeployed } from '@/lib/not-deployed';
import { METER_TYPES, meterTypeLabel, today, type MeterType } from '../../utility-ui';
import { skippedByReason } from './bills-batch';


function BillsBatchForm(): ReactNode {
  const router = useRouter();
  const block = useSearchParams()?.get('block') ?? null;
  const { addToast } = useToast();
  const batch = useInvoiceBatch();
  const autoPost = useUtilitySettings().data?.utility_billing?.auto_post ?? false;
  const [meterType, setMeterType] = useState<MeterType>('water');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [ledgerId, setLedgerId] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(today());
  const [postNow, setPostNow] = useState(autoPost);
  const [problem, setProblem] = useState<string | null>(null);
  const [result, setResult] = useState<InvoiceBatchResult | null>(null);
  useEffect(() => setPostNow(autoPost), [autoPost]);

  function submit(): void {
    if (!from || !to || from > to) return setProblem('Give the period of the bills (From on or before To).');
    setProblem(null);
    batch.mutate(
      {
        filter: { meter_type: meterType, period_from: from, period_to: to, ...(block ? { block } : {}) },
        ...(ledgerId ? { ledger_account_id: ledgerId } : {}),
        invoice_date: invoiceDate,
        post_now: postNow,
      },
      {
        onSuccess: (done) => {
          setResult(done);
          addToast({ title: 'Utility invoices created', description: batchSummary(done), variant: 'success' });
        },
        onError: (error) => setProblem(isNotDeployed(error) ? 'Invoicing in batch is not available yet on this server.' : friendlyError(error)),
      },
    );
  }

  return (
    <FormFrame
      mode="page"
      title={`Calculated bills to invoices — ${block ?? 'All Blocks'}`}
      description="Every pending bill of the meter type whose period lies within these dates: one invoice per unit, one line per bill."
      onClose={() => router.push(block ? `/utilities/bulk-posting?block=${encodeURIComponent(block)}` : '/utilities/bulk-posting')}
      onSave={submit}
      saving={batch.isPending}
      saveLabel="Create invoices"
      savingLabel="Invoicing…"
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor="bp-type">Meter type</Label>
          <Select id="bp-type" value={meterType} onChange={(e) => setMeterType(e.target.value as MeterType)}>
            {METER_TYPES.map((type) => (
              <option key={type} value={type}>{meterTypeLabel(type)}</option>
            ))}
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="bp-from">Bills from</Label>
          <Input id="bp-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="bp-to">Bills to</Label>
          <Input id="bp-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>
      <div className="space-y-1">
        <Label>Income account (optional)</Label>
        <AccountSearchSelect value={ledgerId} onChange={setLedgerId} accountType={['income']} placeholder="Each meter rule's account" />
        <p className="text-xs text-muted-foreground">Leave blank to use the income account of the meter rule in force.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="bp-date">Invoice date</Label>
          <Input id="bp-date" type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
        </div>
        <label className="flex items-center gap-2 self-end text-sm">
          <input type="checkbox" checked={postNow} onChange={(e) => setPostNow(e.target.checked)} />
          Post now (otherwise saved as drafts)
        </label>
      </div>
      {problem && <p role="alert" className="text-sm text-destructive">{problem}</p>}
      {result && (
        <div className="space-y-1 rounded-md border p-3 text-sm">
          <p>{batchSummary(result)}</p>
          {skippedByReason(result).map((row) => (
            <p key={row.reason} className="text-muted-foreground">
              {row.count} not invoiced: {row.reason}
            </p>
          ))}
        </div>
      )}
    </FormFrame>
  );
}

// Utility Tracker › Bulk Posting › Calculated bills to invoices › Invoices in Batch (UTIL-07, UTIL-12).
export default function BillsBatchPage(): ReactNode {
  return (
    <Suspense fallback={null}>
      <BillsBatchForm />
    </Suspense>
  );
}
