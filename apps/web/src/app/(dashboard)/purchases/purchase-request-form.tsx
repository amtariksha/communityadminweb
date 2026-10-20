'use client';

import { useState, type ReactNode } from 'react';
import { FormFrame, type FormMode } from '@/components/form-page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import {
  useCreatePurchaseRequest,
  useSubmitPurchaseRequest,
  useUpdatePurchaseRequest,
  type PRDetail,
} from '@/hooks/use-purchase-requests';
import { friendlyError } from '@/lib/api-error';
import { rupees, sumAmounts } from '@/lib/gst-lines';
import { ApprovalBlocks } from './purchase-request/approval-blocks';
import { HeadPicker } from './purchase-request/head-picker';
import { LinesGrid } from './purchase-request/lines-grid';
import { PurchaseRequestView } from './purchase-request/purchase-request-view';
import { QuotationFiles } from './purchase-request/quotation-files';
import { useQuotationFiles } from './purchase-request/use-quotation-files';
import { useRemoveQuotation } from './purchase-request/use-remove-quotation';
import { amountsOf, hasErrors, requestPayload, validateRequest, type RequestErrors } from './purchase-request/request-state';
import { useRequestForm } from './purchase-request/use-request-form';

export interface PurchaseRequestFormProps {
  mode: FormMode;
  /** Open a stored request: a draft of yours to edit, anything else to view. */
  requestId?: string | null;
  /** Dialog only. */
  open?: boolean;
  onClose: () => void;
  onSaved: (detail: PRDetail, sent: boolean) => void;
}

function Totals({ lines }: { lines: ReturnType<typeof useRequestForm>['values']['lines'] }): ReactNode {
  const total = sumAmounts(lines.map(amountsOf));
  const rows: Array<[string, number]> = [
    ['Taxable total', total.taxable],
    ['CGST', total.cgst],
    ['SGST', total.sgst],
    ['IGST', total.igst],
    ['Grand total', total.total],
  ];
  return (
    <dl className="ml-auto grid w-72 grid-cols-2 gap-1 text-sm" aria-label="Totals">
      {rows.map(([label, paise]) => (
        <div key={label} className="contents">
          <dt className={label === 'Grand total' ? 'font-semibold' : 'text-muted-foreground'}>{label}</dt>
          <dd className={`text-right tabular-nums ${label === 'Grand total' ? 'font-semibold' : ''}`}>{rupees(paise)}</dd>
        </div>
      ))}
    </dl>
  );
}

type Quotations = ReturnType<typeof useQuotationFiles>;

function useSave(
  form: ReturnType<typeof useRequestForm>,
  quotations: Quotations,
  requestId: string | null | undefined,
  onSaved: PurchaseRequestFormProps['onSaved'],
) {
  const create = useCreatePurchaseRequest();
  const update = useUpdatePurchaseRequest();
  const submit = useSubmitPurchaseRequest();
  const { addToast } = useToast();
  const [errors, setErrors] = useState<RequestErrors>({});

  async function save(sending: boolean): Promise<void> {
    const found = validateRequest(form.values, form.rates, sending);
    setErrors(found);
    if (hasErrors(found)) return;
    const payload = requestPayload(form.values, sending);
    const withFiles = async (id: string): Promise<void> => {
      const failed = await quotations.attachAll(id);
      if (failed.length > 0) {
        addToast({ title: 'Request saved; some quotations were not attached', description: failed.join(', '), variant: 'warning' });
      }
    };
    try {
      if (!requestId) {
        const created = await create.mutateAsync(payload);
        await withFiles(created.purchase_request.id);
        onSaved(created, sending);
        return;
      }
      const { approval, submit: _send, ...fields } = payload;
      const saved = await update.mutateAsync({ id: requestId, ...fields });
      await withFiles(requestId);
      onSaved(sending ? await submit.mutateAsync({ id: requestId, approval }) : saved, sending);
    } catch (failure) {
      addToast({ title: 'Could not save the request', description: friendlyError(failure), variant: 'destructive' });
    }
  }
  return { save, errors, saving: create.isPending || update.isPending || submit.isPending };
}

/**
 * Create / edit purchase request (EXP-S6, EXP-08): header, request
 * details, lines by expense head with GST per line, live totals and the
 * approvers per level. The same form is a page in classic and a dialog in
 * standard (SB-07). Others' requests, and sent ones, open read-only with
 * the approval trail.
 */
export function PurchaseRequestForm(props: PurchaseRequestFormProps): ReactNode {
  const form = useRequestForm(props.requestId);
  const quotations = useQuotationFiles(form.stored?.attachments.length ?? 0);
  const { save, errors, saving } = useSave(form, quotations, props.requestId, props.onSaved);
  const removal = useRemoveQuotation(props.requestId);
  const [picking, setPicking] = useState(false);

  if (form.heads.data === null) {
    return <p className="text-sm text-muted-foreground">Purchase requests with lines are not available yet.</p>;
  }
  if (props.requestId && form.detail.data === null) {
    return <p className="text-sm text-muted-foreground">This purchase request cannot be opened here yet.</p>;
  }
  if (form.stored && !form.editable) return <PurchaseRequestView mode={props.mode} open={props.open} detail={form.stored} onClose={props.onClose} />;

  const { values, setField } = form;
  return (
    <FormFrame
      mode={props.mode}
      open={props.open}
      title={props.requestId ? 'Edit purchase request' : 'Create purchase request'}
      onClose={props.onClose}
      onSave={() => void save(true)}
      saveLabel="Send for approval"
      savingLabel="Saving…"
      secondaryAction={{ label: 'Save as draft', onClick: () => void save(false) }}
      saving={saving}
      dialogClassName="max-w-6xl"
    >
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-1 md:col-span-2">
          <Label htmlFor="pr-title">Title *</Label>
          <Input id="pr-title" value={values.title} onChange={(e) => setField('title', e.target.value)} />
          {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor="pr-date">Purchase request date *</Label>
          <Input id="pr-date" type="date" value={values.request_date} onChange={(e) => setField('request_date', e.target.value)} />
          {errors.request_date && <p className="text-xs text-destructive">{errors.request_date}</p>}
        </div>
        <div className="space-y-1 md:col-span-3">
          <Label htmlFor="pr-vendor">Vendor</Label>
          <select
            id="pr-vendor"
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={values.vendor_id}
            onChange={(e) => setField('vendor_id', e.target.value)}
          >
            <option value="">Pick a vendor</option>
            {form.vendors.map((vendor) => (
              <option key={vendor.id} value={vendor.id}>
                {vendor.name}
              </option>
            ))}
          </select>
          {errors.vendor_id && <p className="text-xs text-destructive">{errors.vendor_id}</p>}
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="pr-details">Request details</Label>
        <Textarea id="pr-details" rows={4} value={values.details} onChange={(e) => setField('details', e.target.value)} />
        {errors.details && <p className="text-xs text-destructive">{errors.details}</p>}
      </div>
      <QuotationFiles
        attached={form.stored?.attachments ?? []}
        waiting={quotations.files}
        refused={quotations.refused}
        onAdd={quotations.add}
        onRemove={quotations.remove}
        onRemoveAttached={props.requestId ? (id) => void removal.removeAttached(id) : undefined}
        removingId={removal.removingId}
      />
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Lines</h3>
          <Button type="button" variant="outline" size="sm" onClick={() => setPicking(true)}>
            + Add account head
          </Button>
        </div>
        {values.lines.length > 0 ? (
          <LinesGrid
            lines={values.lines}
            heads={form.heads.data?.data ?? []}
            rates={form.rates}
            readOnly={false}
            errors={errors.line}
            onChange={form.changeLine}
            onRemove={form.removeLine}
          />
        ) : (
          <p className="text-sm text-muted-foreground">Add at least one expense head</p>
        )}
        {errors.lines && <p className="text-xs text-destructive">{errors.lines}</p>}
        <Totals lines={values.lines} />
      </div>
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Approval</h3>
        <ApprovalBlocks levels={values.levels} readOnly={false} onChange={form.changeLevel} />
        {errors.levels && <p className="text-xs text-destructive">{errors.levels}</p>}
      </div>
      <HeadPicker
        open={picking}
        heads={form.heads.data?.data ?? []}
        onPick={(head) => {
          form.addHead(head);
          setPicking(false);
        }}
        onClose={() => setPicking(false)}
      />
    </FormFrame>
  );
}
