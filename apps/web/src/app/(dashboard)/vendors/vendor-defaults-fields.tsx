'use client';

import type { ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { useInvoiceHeads } from '@/hooks/use-vendor-bills';
import { VENDOR_TYPE_OPTIONS, type DefaultGstKind, type VendorDefaultsValues } from './vendor-defaults-form';

interface VendorDefaultsFieldsProps {
  idPrefix: string;
  values: VendorDefaultsValues;
  onChange: (values: VendorDefaultsValues) => void;
}

const GST_KINDS: ReadonlyArray<[DefaultGstKind, string]> = [
  ['none', 'No default'],
  ['cgst_sgst', 'CGST + SGST'],
  ['igst', 'IGST'],
];

/** VEND-05 — Account Head, GST, state code, vendor type, payee and legal name on the vendor form. */
export function VendorDefaultsFields({ idPrefix, values, onChange }: VendorDefaultsFieldsProps): ReactNode {
  const heads = useInvoiceHeads().data;
  const rates = heads?.gst.rate_options ?? [0, 5, 18, 40];
  const set = (patch: Partial<VendorDefaultsValues>): void => onChange({ ...values, ...patch });
  const id = (name: string): string => `${idPrefix}-${name}`;

  return (
    <fieldset className="space-y-3 rounded-md border p-3">
      <legend className="px-1 text-sm font-medium">Accounting defaults (fill new invoices)</legend>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={id('head')}>Account Head</Label>
          <Select id={id('head')} value={values.head} onChange={(e) => set({ head: e.target.value })}>
            <option value="">None</option>
            {(heads?.data ?? []).map((h) => (
              <option key={h.ledger_account_id} value={h.ledger_account_id}>{h.code ? `${h.code} ${h.name}` : h.name}</option>
            ))}
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <Label htmlFor={id('gst-kind')}>GST</Label>
            <Select id={id('gst-kind')} value={values.gstKind} onChange={(e) => set({ gstKind: e.target.value as DefaultGstKind, gstRate: e.target.value === 'none' ? '' : values.gstRate })}>
              {GST_KINDS.map(([kind, text]) => <option key={kind} value={kind}>{text}</option>)}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor={id('gst-rate')}>GST Rate %</Label>
            <Select id={id('gst-rate')} value={values.gstRate} disabled={values.gstKind === 'none'} onChange={(e) => set({ gstRate: e.target.value })}>
              <option value="">—</option>
              {rates.map((rate) => <option key={rate} value={String(rate)}>{rate}%</option>)}
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor={id('state')}>State code</Label>
          <Input id={id('state')} placeholder="From the GSTIN" maxLength={2} inputMode="numeric" value={values.stateCode} onChange={(e) => set({ stateCode: e.target.value.replace(/\D/g, '') })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor={id('payee')}>Payee Name</Label>
          <Input id={id('payee')} placeholder="Printed on payment vouchers" maxLength={255} value={values.payeeName} onChange={(e) => set({ payeeName: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor={id('legal')}>Legal name</Label>
          <Input id={id('legal')} maxLength={255} value={values.legalName} onChange={(e) => set({ legalName: e.target.value })} />
        </div>
        <div className="space-y-2">
          <span className="text-sm font-medium">Vendor type</span>
          <div className="flex flex-wrap gap-3 pt-2 text-sm">
            {VENDOR_TYPE_OPTIONS.map(([type, text]) => (
              <label key={type} className="flex items-center gap-1">
                <input type="radio" name={id('type')} checked={values.vendorType === type} onChange={() => set({ vendorType: type })} />
                {text}
              </label>
            ))}
          </div>
        </div>
      </div>
    </fieldset>
  );
}
