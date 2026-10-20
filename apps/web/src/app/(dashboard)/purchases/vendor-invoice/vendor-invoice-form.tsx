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
import { useTenant } from '@/hooks/use-tenants';
import { getCurrentTenant } from '@/lib/auth';
import { friendlyError } from '@/lib/api-error';
import {
  addDays,
  defaultRow,
  emptyRows,
  formIssue,
  readCreditDays,
  toInvoiceInput,
  vendorHeaderDefaults,
  type InvoiceHeader,
  type InvoiceRow,
} from './invoice-model';
import { InvoiceLineGrid } from './invoice-line-grid';
import { InvoiceFiles } from './invoice-files';
import { useInvoiceFiles } from './use-invoice-files';
import { useInvoiceScan } from './use-invoice-scan';
import { InvoiceEntriesPanel, InvoiceTdsBlock } from './invoice-side-panels';
import { useConvertRequestToInvoice, useRequestPrefill } from './from-request';
import { useBillPrefill, useEditVendorInvoice } from './edit-bill';

export interface VendorInvoiceFormProps {
  mode: FormMode;
  /** Fixed by the route on the page (By Vendors › Invoice); chosen in the form in the dialog. */
  vendorId?: string;
  open?: boolean;
  /** EXP-10 — an approved purchase request to convert: its lines and vendor fill the form. */
  fromRequestId?: string;
  /** EXP-S10 — an invoice to edit (by reversal and re-post): it fills the form, Post Entries re-posts it. */
  editBillId?: string;
  onClose: () => void;
  onSaved: (bill: PostedVendorInvoice) => void;
}

const today = (): string => new Date().toISOString().slice(0, 10);

function blankHeader(vendorId = '', creditDays: number): InvoiceHeader {
  const date = today();
  return { vendorId, invoiceNo: '', invoiceDate: date, dueDate: addDays(date, creditDays), tdsValue: '', tdsBasis: 'percent_excl_gst', tdsSection: '', payeeName: '' };
}

const DEFAULT_DAYS_APPLIED = readCreditDays(null);

/**
 * The society's vendor credit days (EXP-S8, SB-15). Once they load, a new
 * invoice's due date follows them unless it was changed by hand.
 */
function useCreditDays(setHeader: (fn: (h: InvoiceHeader) => InvoiceHeader) => void, follow: boolean): number {
  const tenant = useTenant(getCurrentTenant() ?? '');
  const days = readCreditDays(tenant.data?.settings_json as Record<string, unknown> | undefined);
  const applied = useRef(DEFAULT_DAYS_APPLIED);
  useEffect(() => {
    if (!follow || applied.current === days) return;
    const before = applied.current;
    applied.current = days;
    setHeader((h) => (h.invoiceDate && h.dueDate === addDays(h.invoiceDate, before) ? { ...h, dueDate: addDays(h.invoiceDate, days) } : h));
  }, [days, setHeader, follow]);
  return days;
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
  const [header, setHeader] = useState<InvoiceHeader>(() => blankHeader(fixedVendorId, DEFAULT_DAYS_APPLIED));
  // An invoice being edited keeps its own dates and figures.
  const creditDays = useCreditDays(setHeader, !props.editBillId);
  const [rows, setRows] = useState<InvoiceRow[]>(() => emptyRows());
  const [touched, setTouched] = useState(false);
  const heads = useInvoiceHeads();
  const vendorList = useVendors(fixedVendorId ? undefined : { is_active: true, limit: 100 });
  const vendor = useVendor(header.vendorId);
  const tdsConfig = useTdsConfig();
  const create = useCreateVendorInvoice();
  const convert = useConvertRequestToInvoice();
  const edit = useEditVendorInvoice();
  const fromRequest = useRequestPrefill(props.fromRequestId, setHeader, setRows);
  const editing = useBillPrefill(props.editBillId, setHeader, setRows);
  const fileRef = useRef<HTMLInputElement>(null);
  const prefilledFor = useRef<string>('');

  const headList = useMemo(() => heads.data?.data ?? [], [heads.data]);
  useVendorDefaults(props.editBillId ? undefined : vendor.data, headList, prefilledFor, setHeader, setRows, Boolean(props.fromRequestId));

  const input = useMemo(() => toInvoiceInput(header, rows), [header, rows]);
  const debouncedInput = useDebouncedValue(input, 400);
  const preview = useBillPreview(debouncedInput);
  const issue = formIssue(header, rows);
  const patch = (next: Partial<InvoiceHeader>): void => setHeader((h) => ({ ...h, ...next }));
  const invoiceFiles = useInvoiceFiles();
  const scan = useInvoiceScan(vendorList.data?.data ?? [], fixedVendorId, setHeader, setRows);

  /** After posting: the waiting files go up and are recorded on the invoice. */
  async function finish(bill: PostedVendorInvoice): Promise<void> {
    const failed = await invoiceFiles.attachAll(bill.id);
    addToast(
      failed.length
        ? { title: `Invoice posted as ${bill.bill_number}; some files were not attached`, description: failed.join(', '), variant: 'warning' }
        : { title: `Invoice posted as ${bill.bill_number}`, variant: 'success' },
    );
    props.onSaved(bill);
  }

  function save(): void {
    setTouched(true);
    if (!input || editing.issue) return;
    const handlers = {
      onSuccess(bill: PostedVendorInvoice) {
        void finish(bill);
      },
      onError(error: Error) {
        addToast({ title: 'Could not post the invoice', description: friendlyError(error), variant: 'destructive' });
      },
    };
    // EXP-10: from a purchase request, posting converts the request.
    if (props.fromRequestId) convert.mutate({ requestId: props.fromRequestId, input }, handlers);
    else if (props.editBillId) edit.mutate({ billId: props.editBillId, input }, handlers);
    else create.mutate(input, handlers);
  }

  const vendorName = vendor.data?.name ?? '';
  return (
    <FormFrame
      mode={mode}
      open={props.open}
      title={formTitle(fixedVendorId ? vendorName : '', fromRequest.detail?.purchase_request.pr_number, editing.bill?.bill_number)}
      saveLabel="Post Entries"
      savingLabel="Posting…"
      saving={create.isPending || convert.isPending || edit.isPending}
      onSave={save}
      onClose={props.onClose}
      dialogClassName="max-w-6xl"
    >
      <HeaderFields header={header} onChange={patch} creditDays={creditDays} vendors={fixedVendorId ? null : vendorList.data?.data ?? []} />
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
      <InvoiceFiles waiting={invoiceFiles.files} refused={invoiceFiles.refused} onAdd={invoiceFiles.add} onRemove={invoiceFiles.remove} />
      <InvoiceEntriesPanel preview={input ? ownNumberAllowed(preview.data, editing.bill, header.invoiceNo) : undefined} loading={preview.isFetching} error={input ? preview.error : null} />
      {editing.issue && <p role="alert" className="text-sm text-destructive">{editing.issue}</p>}
      {touched && issue && <p role="alert" className="text-sm text-destructive">{issue}</p>}
    </FormFrame>
  );
}

function formTitle(vendorName: string, requestNumber?: string, editedBill?: string): string {
  const what = editedBill ? `Edit vendor invoice ${editedBill}` : 'Post vendor invoice';
  return `${what}${vendorName ? ` — ${vendorName}` : ''}${requestNumber ? ` (from ${requestNumber})` : ''}`;
}

/** An invoice being edited keeps its own number: the preview's "already has" warning is about itself. */
function ownNumberAllowed<P extends { duplicate_invoice_number: boolean }>(
  preview: P | undefined,
  bill: { vendor_invoice_number: string | null } | null,
  invoiceNo: string,
): P | undefined {
  if (!preview || !bill || bill.vendor_invoice_number?.trim().toLowerCase() !== invoiceNo.trim().toLowerCase()) return preview;
  return { ...preview, duplicate_invoice_number: false };
}

/** Once per vendor: line 1, TDS and payee from the vendor's defaults. */
function useVendorDefaults(
  vendor: Vendor | undefined,
  heads: readonly InvoiceHead[],
  prefilledFor: { current: string },
  setHeader: (fn: (h: InvoiceHeader) => InvoiceHeader) => void,
  setRows: (fn: (rows: InvoiceRow[]) => InvoiceRow[]) => void,
  // EXP-10: lines come from the purchase request, not the vendor's default.
  keepRows = false,
): void {
  useEffect(() => {
    if (!vendor || prefilledFor.current === vendor.id) return;
    if (vendor.default_expense_account_id && heads.length === 0) return;
    prefilledFor.current = vendor.id;
    setHeader((h) => ({ ...h, ...vendorHeaderDefaults(vendor) }));
    if (!keepRows) setRows((rows) => [defaultRow(vendor, heads), ...rows.slice(1)]);
  }, [vendor, heads, prefilledFor, setHeader, setRows, keepRows]);
}

function HeaderFields(props: {
  header: InvoiceHeader;
  onChange: (patch: Partial<InvoiceHeader>) => void;
  creditDays: number;
  vendors: Vendor[] | null;
}): ReactNode {
  const { header, onChange, creditDays } = props;
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
        <Input id="inv-date" type="date" value={header.invoiceDate} onChange={(e) => onChange({ invoiceDate: e.target.value, dueDate: e.target.value ? addDays(e.target.value, creditDays) : header.dueDate })} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="inv-due">Due date *</Label>
        <Input id="inv-due" type="date" value={header.dueDate} onChange={(e) => onChange({ dueDate: e.target.value })} />
      </div>
    </div>
  );
}
