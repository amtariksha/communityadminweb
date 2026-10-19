'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Vendor } from '@communityos/shared';
import { FormFrame, type FormMode } from '@/components/form-page';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { useTdsConfig, useVendor, useVendors } from '@/hooks';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useBillPreview, useCreateVendorInvoice, useInvoiceHeads, type InvoiceHead, type PostedVendorInvoice } from '@/hooks/use-vendor-bills';
import { friendlyError } from '@/lib/api-error';
import {
  addDays,
  DEFAULT_CREDIT_DAYS,
  defaultRow,
  emptyRows,
  formIssue,
  toInvoiceInput,
  vendorHeaderDefaults,
  type InvoiceHeader,
  type InvoiceRow,
} from './invoice-model';
import { InvoiceLineGrid } from './invoice-line-grid';
import { useInvoiceScan } from './use-invoice-scan';
import { InvoiceEntriesPanel, InvoiceTdsBlock } from './invoice-side-panels';

export interface VendorInvoiceFormProps {
  mode: FormMode;
  /** Fixed by the route on the page (By Vendors › Invoice); chosen in the form in the dialog. */
  vendorId?: string;
  open?: boolean;
  onClose: () => void;
  onSaved: (bill: PostedVendorInvoice) => void;
}

const today = (): string => new Date().toISOString().slice(0, 10);

function blankHeader(vendorId = ''): InvoiceHeader {
  const date = today();
  return { vendorId, invoiceNo: '', invoiceDate: date, dueDate: addDays(date, DEFAULT_CREDIT_DAYS), tdsValue: '', tdsBasis: 'percent_excl_gst', tdsSection: '', payeeName: '' };
}

/** The rates a line dated `date` may carry: the society's, plus 12 and 28 before the reform date. */
function rateOptionsFor(gst: { rate_options: number[]; pre_reform_rates: number[]; reform_date: string } | undefined, date: string): number[] {
  if (!gst) return [0, 5, 18, 40];
  const rates = date && date < gst.reform_date ? [...gst.rate_options, ...gst.pre_reform_rates] : gst.rate_options;
  return [...new Set(rates)].sort((a, b) => a - b);
}

/**
 * Post a vendor invoice (EXP-12, screen EXP-S8): header, seven-row line grid
 * with GST per line, TDS block, payee name and the entries that will be
 * posted, recomputed by the server as the form changes. The vendor's
 * defaults (VEND-05) fill a new invoice; "Scan invoice with AI" fills the
 * header and line 1.
 */
export function VendorInvoiceForm(props: VendorInvoiceFormProps): ReactNode {
  const { mode, vendorId: fixedVendorId } = props;
  const { addToast } = useToast();
  const [header, setHeader] = useState<InvoiceHeader>(() => blankHeader(fixedVendorId));
  const [rows, setRows] = useState<InvoiceRow[]>(() => emptyRows());
  const [touched, setTouched] = useState(false);
  const heads = useInvoiceHeads();
  const vendorList = useVendors(fixedVendorId ? undefined : { is_active: true, limit: 100 });
  const vendor = useVendor(header.vendorId);
  const tdsConfig = useTdsConfig();
  const create = useCreateVendorInvoice();
  const fileRef = useRef<HTMLInputElement>(null);
  const prefilledFor = useRef<string>('');

  const headList = useMemo(() => heads.data?.data ?? [], [heads.data]);
  useVendorDefaults(vendor.data, headList, prefilledFor, setHeader, setRows);

  const input = useMemo(() => toInvoiceInput(header, rows), [header, rows]);
  const debouncedInput = useDebouncedValue(input, 400);
  const preview = useBillPreview(debouncedInput);
  const issue = formIssue(header, rows);
  const patch = (next: Partial<InvoiceHeader>): void => setHeader((h) => ({ ...h, ...next }));
  const scan = useInvoiceScan(vendorList.data?.data ?? [], fixedVendorId, setHeader, setRows);

  function save(): void {
    setTouched(true);
    if (!input) return;
    create.mutate(input, {
      onSuccess(bill) {
        addToast({ title: `Invoice posted as ${bill.bill_number}`, variant: 'success' });
        props.onSaved(bill);
      },
      onError(error) {
        addToast({ title: 'Could not post the invoice', description: friendlyError(error), variant: 'destructive' });
      },
    });
  }

  const vendorName = vendor.data?.name ?? '';
  return (
    <FormFrame
      mode={mode}
      open={props.open}
      title={fixedVendorId ? `Post vendor invoice — ${vendorName}` : 'Post vendor invoice'}
      saveLabel="Post Entries"
      savingLabel="Posting…"
      saving={create.isPending}
      onSave={save}
      onClose={props.onClose}
      dialogClassName="max-w-6xl"
    >
      <HeaderFields header={header} onChange={patch} vendors={fixedVendorId ? null : vendorList.data?.data ?? []} />
      <div className="flex items-center gap-2">
        <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" aria-label="Invoice file to scan" onChange={(e) => { void scan.read(e.target.files?.[0]); e.target.value = ''; }} />
        <button type="button" className="text-sm text-primary underline" disabled={scan.pending} onClick={() => fileRef.current?.click()}>
          {scan.pending ? 'Reading the invoice…' : 'Scan invoice with AI'}
        </button>
      </div>
      <InvoiceLineGrid rows={rows} onChange={setRows} heads={headList} rateOptions={rateOptionsFor(heads.data?.gst, header.invoiceDate)} computed={preview.data?.lines} />
      <InvoiceTdsBlock header={header} sections={tdsConfig.data?.config.sections ?? []} onChange={patch} />
      <div className="space-y-1">
        <Label htmlFor="inv-payee">Payee Name</Label>
        <Input id="inv-payee" maxLength={255} value={header.payeeName} onChange={(e) => patch({ payeeName: e.target.value })} />
      </div>
      <InvoiceEntriesPanel preview={input ? preview.data : undefined} loading={preview.isFetching} error={input ? preview.error : null} />
      {touched && issue && <p role="alert" className="text-sm text-destructive">{issue}</p>}
    </FormFrame>
  );
}

/** Once per vendor: line 1, TDS and payee from the vendor's defaults. */
function useVendorDefaults(
  vendor: Vendor | undefined,
  heads: readonly InvoiceHead[],
  prefilledFor: { current: string },
  setHeader: (fn: (h: InvoiceHeader) => InvoiceHeader) => void,
  setRows: (fn: (rows: InvoiceRow[]) => InvoiceRow[]) => void,
): void {
  useEffect(() => {
    if (!vendor || prefilledFor.current === vendor.id) return;
    if (vendor.default_expense_account_id && heads.length === 0) return;
    prefilledFor.current = vendor.id;
    setHeader((h) => ({ ...h, ...vendorHeaderDefaults(vendor) }));
    setRows((rows) => [defaultRow(vendor, heads), ...rows.slice(1)]);
  }, [vendor, heads, prefilledFor, setHeader, setRows]);
}

function HeaderFields(props: { header: InvoiceHeader; onChange: (patch: Partial<InvoiceHeader>) => void; vendors: Vendor[] | null }): ReactNode {
  const { header, onChange } = props;
  return (
    <div className="grid gap-3 sm:grid-cols-4">
      {props.vendors && (
        <div className="space-y-1">
          <Label htmlFor="inv-vendor">Vendor *</Label>
          <Select id="inv-vendor" value={header.vendorId} onChange={(e) => onChange({ vendorId: e.target.value })}>
            <option value="">Pick a vendor</option>
            {props.vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </Select>
        </div>
      )}
      <div className="space-y-1">
        <Label htmlFor="inv-number">Invoice No *</Label>
        <Input id="inv-number" maxLength={50} value={header.invoiceNo} onChange={(e) => onChange({ invoiceNo: e.target.value })} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="inv-date">Invoice date *</Label>
        <Input id="inv-date" type="date" value={header.invoiceDate} onChange={(e) => onChange({ invoiceDate: e.target.value, dueDate: e.target.value ? addDays(e.target.value, DEFAULT_CREDIT_DAYS) : header.dueDate })} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="inv-due">Due date *</Label>
        <Input id="inv-due" type="date" value={header.dueDate} onChange={(e) => onChange({ dueDate: e.target.value })} />
      </div>
    </div>
  );
}
