'use client';

import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FormFieldError } from '@/components/ui/form-field-error';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { UserSearchSelect } from '@/components/ui/user-search-select';
import { useCreateVendor, useUpdateVendor, useVendor } from '@/hooks';
import { friendlyError } from '@/lib/api-error';
import { normalizePhone } from '@/lib/validation';
import { VendorFormFields } from './vendor-form-fields';
import {
  createVendorPayload,
  emptyVendorForm,
  updateVendorPayload,
  vendorFormFromVendor,
  type VendorFormValues,
  type VendorPayload,
} from './vendor-form';

/** Phone is optional, but a typed one must be an Indian mobile. Null = refused. */
function withCanonicalPhone(payload: VendorPayload, onInvalid: (message: string) => void): VendorPayload | null {
  if (payload.phone === undefined || payload.phone === null) return payload;
  const phone = normalizePhone(payload.phone);
  if (!phone.ok) {
    onInvalid(phone.error);
    return null;
  }
  return { ...payload, phone: phone.value || null };
}

function MemberPicker({ values, onChange }: { values: VendorFormValues; onChange: (values: VendorFormValues) => void }): ReactNode {
  // QA #250 — a society member can also be a vendor; picking one prefills name, phone and email.
  return (
    <div className="space-y-2">
      <Label htmlFor="vendor-from-member">Pick from members (optional)</Label>
      <UserSearchSelect
        scope="tenant"
        value={null}
        onChange={(hit) => {
          if (!hit) return;
          onChange({
            ...values,
            name: hit.name || values.name,
            phone: hit.phone ? hit.phone.replace(/^\+91/, '') : values.phone,
            email: hit.email || values.email,
          });
        }}
        placeholder="Search by name or phone…"
      />
    </div>
  );
}

export function AddVendorDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }): ReactNode {
  const { addToast } = useToast();
  const [values, setValues] = useState<VendorFormValues>(emptyVendorForm);
  const createVendor = useCreateVendor();

  function handleSubmit(e: FormEvent): void {
    e.preventDefault();
    const payload = withCanonicalPhone(createVendorPayload(values), (description) =>
      addToast({ title: 'Invalid phone number', description, variant: 'destructive' }),
    );
    if (!payload) return;
    createVendor.mutate(payload as VendorPayload & { name: string }, {
      onSuccess() {
        onOpenChange(false);
        setValues(emptyVendorForm());
        addToast({ title: 'Vendor added successfully', variant: 'success' });
      },
      onError(error) {
        addToast({ title: 'Failed to add vendor', description: friendlyError(error), variant: 'destructive' });
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Vendor</DialogTitle>
            <DialogDescription>Add a new vendor or service provider</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <MemberPicker values={values} onChange={setValues} />
            <VendorFormFields
              idPrefix="vendor"
              values={values}
              onChange={setValues}
              phoneError={<FormFieldError error={createVendor.error} field="phone" />}
            />
          </div>
          <DialogFooter>
            <DialogClose><Button type="button" variant="outline">Cancel</Button></DialogClose>
            <Button type="submit" disabled={createVendor.isPending}>
              {createVendor.isPending ? 'Adding...' : 'Add Vendor'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Edit: the form loads the stored vendor and saves only what changed. */
export function EditVendorDialog({ vendorId, onClose }: { vendorId: string | null; onClose: () => void }): ReactNode {
  const { addToast } = useToast();
  const vendorQuery = useVendor(vendorId ?? '');
  const updateVendor = useUpdateVendor();
  const [initial, setInitial] = useState<VendorFormValues | null>(null);
  const [values, setValues] = useState<VendorFormValues>(emptyVendorForm);

  useEffect(() => {
    if (!vendorId) setInitial(null);
    if (vendorId && vendorQuery.data && vendorQuery.data.id === vendorId) {
      const loaded = vendorFormFromVendor(vendorQuery.data);
      setInitial(loaded);
      setValues(loaded);
    }
  }, [vendorId, vendorQuery.data]);

  function handleSubmit(e: FormEvent): void {
    e.preventDefault();
    if (!vendorId || !initial) return;
    const payload = withCanonicalPhone(updateVendorPayload(initial, values), (description) =>
      addToast({ title: 'Invalid phone number', description, variant: 'destructive' }),
    );
    if (!payload) return;
    if (Object.keys(payload).length === 0) {
      onClose();
      return;
    }
    updateVendor.mutate({ id: vendorId, data: payload }, {
      onSuccess() {
        onClose();
        addToast({ title: 'Vendor updated successfully', variant: 'success' });
      },
      onError(error) {
        addToast({ title: 'Failed to update vendor', description: friendlyError(error), variant: 'destructive' });
      },
    });
  }

  return (
    <Dialog open={vendorId !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Vendor</DialogTitle>
            <DialogDescription>Update vendor details</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {initial ? (
              <VendorFormFields
                idPrefix="edit-vendor"
                values={values}
                onChange={setValues}
                showActive
                phoneError={<FormFieldError error={updateVendor.error} field="phone" />}
              />
            ) : (
              <div className="space-y-3"><Skeleton className="h-9 w-full" /><Skeleton className="h-9 w-full" /></div>
            )}
          </div>
          <DialogFooter>
            <DialogClose><Button type="button" variant="outline">Cancel</Button></DialogClose>
            <Button type="submit" disabled={!initial || updateVendor.isPending}>
              {updateVendor.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
