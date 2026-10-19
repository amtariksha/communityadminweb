'use client';

import { useState, type ReactNode } from 'react';
import { FormFrame } from '@/components/form-page';
import { ShowLogsButton } from '@/components/show-logs';
import { FormFieldError } from '@/components/ui/form-field-error';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { useCreateVendor, useUpdateVendor, useVendor } from '@/hooks';
import { friendlyError } from '@/lib/api-error';
import { normalizePhone } from '@/lib/validation';
import { formatCurrency } from '@/lib/utils';
import type { Vendor } from '@communityos/shared';
import { VendorFormFields } from './vendor-form-fields';
import {
  createVendorPayload,
  emptyVendorForm,
  updateVendorPayload,
  vendorFormFromVendor,
  type VendorFormValues,
  type VendorPayload,
} from './vendor-form';

type VendorWithTotals = Vendor & { total_outstanding?: number | string; total_bills?: number; pending_bills?: number };

interface VendorFormPageProps {
  /** Edit this vendor; absent to add one. */
  vendorId?: string;
  onClose: () => void;
  onSaved: () => void;
}

/** A typed phone must be an Indian mobile; null = refused (message shown). */
function canonicalPhone(payload: VendorPayload): { payload: VendorPayload } | { error: string } {
  if (payload.phone === undefined || payload.phone === null) return { payload };
  const phone = normalizePhone(payload.phone);
  return phone.ok ? { payload: { ...payload, phone: phone.value || null } } : { error: phone.error };
}

/** Edit's read-only strip: what the society owes the vendor (VEND-S2). */
function TotalsStrip({ vendor }: { vendor: VendorWithTotals }): ReactNode {
  return (
    <span className="flex flex-wrap items-center gap-4">
      <span>Outstanding: {formatCurrency(Number(vendor.total_outstanding ?? 0))}</span>
      <span>Bills: {vendor.total_bills ?? 0}</span>
      <span>Pending bills: {vendor.pending_bills ?? 0}</span>
      <ShowLogsButton recordTypes={['vendor']} recordId={vendor.id} />
    </span>
  );
}

function VendorFormBody(props: VendorFormPageProps & { vendor?: VendorWithTotals }): ReactNode {
  const { addToast } = useToast();
  const create = useCreateVendor();
  const update = useUpdateVendor();
  const initial = props.vendor ? vendorFormFromVendor(props.vendor) : emptyVendorForm();
  const [values, setValues] = useState<VendorFormValues>(initial);

  async function save(): Promise<void> {
    if (!values.name.trim()) return addToast({ title: 'Enter the vendor name.', variant: 'destructive' });
    const built = canonicalPhone(props.vendor ? updateVendorPayload(initial, values) : createVendorPayload(values));
    if ('error' in built) return addToast({ title: 'Invalid phone number', description: built.error, variant: 'destructive' });
    try {
      if (props.vendor) {
        if (Object.keys(built.payload).length > 0) await update.mutateAsync({ id: props.vendor.id, data: built.payload });
      } else {
        await create.mutateAsync(built.payload as VendorPayload & { name: string });
      }
      addToast({ title: props.vendor ? 'Vendor updated' : 'Vendor added', variant: 'success' });
      props.onSaved();
    } catch (error) {
      addToast({ title: 'Could not save the vendor', description: friendlyError(error), variant: 'destructive' });
    }
  }

  return (
    <FormFrame
      mode="page"
      title={props.vendor ? `Edit Vendor — ${props.vendor.name}` : 'Add Vendor'}
      description={props.vendor ? <TotalsStrip vendor={props.vendor} /> : 'A vendor the society pays (Vendors For Expense).'}
      onClose={props.onClose}
      onSave={() => void save()}
      saving={create.isPending || update.isPending}
    >
      <VendorFormFields
        idPrefix="vendor-page"
        values={values}
        onChange={setValues}
        showActive={Boolean(props.vendor)}
        phoneError={<FormFieldError error={props.vendor ? update.error : create.error} field="phone" />}
      />
    </FormFrame>
  );
}

/** Add / Edit Vendor as a page (VEND-S2, SB-07); the standard dialogs use the same form. */
export function VendorFormPage(props: VendorFormPageProps): ReactNode {
  const query = useVendor(props.vendorId ?? '');
  if (!props.vendorId) return <VendorFormBody {...props} />;
  if (query.error) return <p className="text-sm text-destructive">Could not load the vendor: {friendlyError(query.error)}</p>;
  if (!query.data) return <Skeleton className="h-64 w-full" />;
  return <VendorFormBody key={query.dataUpdatedAt} {...props} vendor={query.data as VendorWithTotals} />;
}
