'use client';

import type { ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useTdsConfig } from '@/hooks';
import { chooseTdsSection, type VendorFormValues } from './vendor-form';
import { VendorDefaultsFields } from './vendor-defaults-fields';

interface VendorFormFieldsProps {
  idPrefix: string;
  values: VendorFormValues;
  onChange: (values: VendorFormValues) => void;
  /** Edit shows the Active switch; Add always creates an active vendor. */
  showActive?: boolean;
  phoneError?: ReactNode;
}

type Setter = (field: keyof VendorFormValues, value: string) => void;

function Field({ id, label, children }: { id: string; label: string; children: ReactNode }): ReactNode {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

function TdsFields({ idPrefix, values, onChange }: Omit<VendorFormFieldsProps, 'showActive' | 'phoneError'>): ReactNode {
  const config = useTdsConfig().data?.config ?? null;
  const sections = config?.sections ?? [];
  const known = sections.some((section) => section.code === values.tds_section);
  return (
    <div className="grid grid-cols-2 gap-4">
      <Field id={`${idPrefix}-tds-section`} label="TDS Section">
        <Select
          id={`${idPrefix}-tds-section`}
          value={values.tds_section}
          onChange={(e) => onChange(chooseTdsSection(values, e.target.value, config))}
        >
          <option value="">None</option>
          {sections.map((section) => (
            <option key={section.code} value={section.code}>
              {section.code} — {section.label} ({section.rate}%)
            </option>
          ))}
          {values.tds_section && !known && <option value={values.tds_section}>{values.tds_section}</option>}
        </Select>
      </Field>
      <Field id={`${idPrefix}-tds-rate`} label="TDS Rate %">
        <Input
          id={`${idPrefix}-tds-rate`}
          type="number"
          min={0}
          max={100}
          step="0.01"
          placeholder="From the section"
          value={values.tds_rate}
          onChange={(e) => onChange({ ...values, tds_rate: e.target.value })}
        />
      </Field>
    </div>
  );
}

function BankFields({ idPrefix, values, set }: { idPrefix: string; values: VendorFormValues; set: Setter }): ReactNode {
  return (
    <div className="space-y-2">
      <Label>Bank Details</Label>
      <div className="grid grid-cols-2 gap-4">
        <Input aria-label="Bank Name" placeholder="Bank Name" value={values.bank_name} onChange={(e) => set('bank_name', e.target.value)} />
        <Input aria-label="Bank Branch" id={`${idPrefix}-bank-branch`} placeholder="Branch" value={values.bank_branch} onChange={(e) => set('bank_branch', e.target.value)} />
        <Input aria-label="Account Number" placeholder="Account Number" value={values.bank_account_number} onChange={(e) => set('bank_account_number', e.target.value)} />
        <Input
          aria-label="IFSC Code"
          placeholder="IFSC Code"
          maxLength={11}
          value={values.bank_ifsc}
          onChange={(e) => set('bank_ifsc', e.target.value.toUpperCase())}
        />
      </div>
    </div>
  );
}

function ContactFields({ idPrefix, values, set, phoneError }: { idPrefix: string; values: VendorFormValues; set: Setter; phoneError?: ReactNode }): ReactNode {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Field id={`${idPrefix}-phone`} label="Phone">
        <Input
          id={`${idPrefix}-phone`}
          type="tel"
          placeholder="10-digit phone"
          maxLength={10}
          pattern="[0-9]{10}"
          inputMode="numeric"
          title="Phone must be exactly 10 digits"
          value={values.phone}
          onChange={(e) => set('phone', e.target.value.replace(/\D/g, ''))}
        />
        {phoneError}
      </Field>
      <Field id={`${idPrefix}-email`} label="Email">
        <Input id={`${idPrefix}-email`} type="email" placeholder="Email address" value={values.email} onChange={(e) => set('email', e.target.value)} />
      </Field>
    </div>
  );
}

function TaxIdFields({ idPrefix, values, set }: { idPrefix: string; values: VendorFormValues; set: Setter }): ReactNode {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Field id={`${idPrefix}-pan`} label="PAN">
        <Input
          id={`${idPrefix}-pan`}
          placeholder="AAAAA1234A"
          maxLength={10}
          pattern="[A-Z]{5}[0-9]{4}[A-Z]{1}"
          title="PAN must be 5 letters, 4 digits, 1 letter (e.g., ABCDE1234F)"
          value={values.pan}
          onChange={(e) => set('pan', e.target.value.toUpperCase())}
        />
      </Field>
      <Field id={`${idPrefix}-gstin`} label="GSTIN">
        <Input id={`${idPrefix}-gstin`} placeholder="Optional" maxLength={15} value={values.gstin} onChange={(e) => set('gstin', e.target.value.toUpperCase())} />
      </Field>
    </div>
  );
}

/** Every field of the vendor form, shared by Add and Edit. */
export function VendorFormFields({ idPrefix, values, onChange, showActive, phoneError }: VendorFormFieldsProps): ReactNode {
  const set: Setter = (field, value) => onChange({ ...values, [field]: value });
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field id={`${idPrefix}-name`} label="Vendor Name">
          <Input id={`${idPrefix}-name`} placeholder="e.g., ABC Services" required value={values.name} onChange={(e) => set('name', e.target.value)} />
        </Field>
        <Field id={`${idPrefix}-contact`} label="Contact Name">
          <Input id={`${idPrefix}-contact`} placeholder="Person to speak to" maxLength={255} value={values.contact_person} onChange={(e) => set('contact_person', e.target.value)} />
        </Field>
      </div>
      <TaxIdFields idPrefix={idPrefix} values={values} set={set} />
      <ContactFields idPrefix={idPrefix} values={values} set={set} phoneError={phoneError} />
      <Field id={`${idPrefix}-address`} label="Billing Address">
        <Textarea id={`${idPrefix}-address`} rows={2} maxLength={1000} value={values.address} onChange={(e) => set('address', e.target.value)} />
      </Field>
      <BankFields idPrefix={idPrefix} values={values} set={set} />
      <TdsFields idPrefix={idPrefix} values={values} onChange={onChange} />
      <VendorDefaultsFields idPrefix={idPrefix} values={values.defaults} onChange={(defaults) => onChange({ ...values, defaults })} />
      {showActive && (
        <label className="flex items-center gap-2 text-sm" htmlFor={`${idPrefix}-active`}>
          <input
            id={`${idPrefix}-active`}
            type="checkbox"
            className="rounded border-input"
            checked={values.is_active}
            onChange={(e) => onChange({ ...values, is_active: e.target.checked })}
          />
          Active — an inactive vendor cannot be billed or paid
        </label>
      )}
    </div>
  );
}
