'use client';

import type { ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useTdsConfig } from '@/hooks';
import { sectionRate } from '../vendors/vendor-form';
import type { PartyFormValues } from './party-form';

type Set = (patch: Partial<PartyFormValues>) => void;

function Text(props: { id: string; label: string; value: string; onChange: (value: string) => void; maxLength?: number }): ReactNode {
  return (
    <div className="space-y-2">
      <Label htmlFor={props.id}>{props.label}</Label>
      <Input id={props.id} maxLength={props.maxLength} value={props.value} onChange={(e) => props.onChange(e.target.value)} />
    </div>
  );
}

function TdsFields({ values, set }: { values: PartyFormValues; set: Set }): ReactNode {
  const config = useTdsConfig().data?.config ?? null;
  const sections = config?.sections ?? [];
  const known = sections.some((section) => section.code === values.tds_section);
  function choose(code: string): void {
    const rate = sectionRate(config, code);
    set({ tds_section: code, ...(values.tds_rate.trim() === '' && rate !== null ? { tds_rate: String(rate) } : {}) });
  }
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="party-tds-section">TDS Section</Label>
        <Select id="party-tds-section" value={values.tds_section} onChange={(e) => choose(e.target.value)}>
          <option value="">None</option>
          {sections.map((section) => (
            <option key={section.code} value={section.code}>
              {section.code} — {section.label} ({section.rate}%)
            </option>
          ))}
          {values.tds_section && !known && <option value={values.tds_section}>{values.tds_section}</option>}
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="party-tds-rate">TDS Rate %</Label>
        <Input id="party-tds-rate" type="number" min={0} max={100} step="0.01" value={values.tds_rate} onChange={(e) => set({ tds_rate: e.target.value })} />
      </div>
    </div>
  );
}

/**
 * The non-member-income party form (VEND-07): the vendor form without
 * Account Head, GST rates and Vendor type. TDS is what the party deducts
 * from what it pays the society.
 */
export function PartyFormFields({ values, set, showActive }: { values: PartyFormValues; set: Set; showActive: boolean }): ReactNode {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">Vendor Details</h3>
      <div className="grid grid-cols-2 gap-4">
        <Text id="party-code" label="Vendor ID" maxLength={30} value={values.party_code} onChange={(party_code) => set({ party_code })} />
        <Text id="party-name" label="Vendor Name *" maxLength={255} value={values.name} onChange={(name) => set({ name })} />
        <Text id="party-contact" label="Vendor Contact Name" maxLength={255} value={values.contact_person} onChange={(contact_person) => set({ contact_person })} />
        <Text id="party-phone" label="Vendor Phone" value={values.phone} onChange={(phone) => set({ phone })} />
        <Text id="party-email" label="Vendor Email" value={values.email} onChange={(email) => set({ email })} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="party-notes">Notes</Label>
        <Textarea id="party-notes" rows={2} maxLength={1000} value={values.notes} onChange={(e) => set({ notes: e.target.value })} />
      </div>
      {showActive && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={values.is_active} onChange={(e) => set({ is_active: e.target.checked })} /> Is Vendor Active?
        </label>
      )}
      <h3 className="text-sm font-semibold">Vendor Payment Information</h3>
      <TdsFields values={values} set={set} />
      <div className="grid grid-cols-2 gap-4">
        <Text id="party-gstin" label="GSTIN" maxLength={15} value={values.gstin} onChange={(gstin) => set({ gstin })} />
        <Text id="party-pan" label="PAN No." maxLength={10} value={values.pan} onChange={(pan) => set({ pan })} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="party-address">Billing Address</Label>
        <Textarea id="party-address" rows={2} maxLength={1000} value={values.address} onChange={(e) => set({ address: e.target.value })} />
      </div>
      <h3 className="text-sm font-semibold">Vendor Bank Details</h3>
      <div className="grid grid-cols-2 gap-4">
        <Text id="party-account" label="Bank Account No." value={values.bank_account_number} onChange={(bank_account_number) => set({ bank_account_number })} />
        <Text id="party-bank" label="Bank Name" value={values.bank_name} onChange={(bank_name) => set({ bank_name })} />
        <Text id="party-branch" label="Branch" value={values.bank_branch} onChange={(bank_branch) => set({ bank_branch })} />
        <Text id="party-ifsc" label="Bank NEFT/IFSC Code" maxLength={11} value={values.bank_ifsc} onChange={(bank_ifsc) => set({ bank_ifsc })} />
      </div>
    </div>
  );
}
