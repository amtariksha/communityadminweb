'use client';

import type { ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { AccountSearchSelect } from '@/components/ui/account-search-select';
import { GstRateSelect } from '@/components/ui/gst-rate-select';
import { useTdsConfig } from '@/hooks';
import { sectionRate } from '../vendors/vendor-form';
import { PAYER_TYPES, type PartyFormValues } from './party-form';

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

/** INC-46 — the Account Head and GST rate a new invoice for the party starts with, and its type. */
function InvoiceDefaults({ values, set, noun }: { values: PartyFormValues; set: Set; noun: string }): ReactNode {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Account Head</Label>
          <AccountSearchSelect
            value={values.default_income_account_id}
            onChange={(default_income_account_id) => set({ default_income_account_id })}
            accountType={['income']}
            incomeScope="non_member"
            placeholder="Non-member income account…"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="party-gst-rate">GST Rate</Label>
          <GstRateSelect
            id="party-gst-rate"
            value={values.default_gst_rate === '' ? null : Number(values.default_gst_rate)}
            onChange={(rate) => set({ default_gst_rate: rate == null ? '' : String(rate) })}
          />
          <p className="text-xs text-muted-foreground">Split CGST + SGST in the society&apos;s state, IGST for a {noun.toLowerCase()} in another state.</p>
        </div>
      </div>
      <fieldset className="flex flex-wrap items-center gap-3 text-sm">
        <legend className="mb-1 font-medium">{noun} Type</legend>
        {PAYER_TYPES.map((option) => (
          <label key={option.value} className="flex items-center gap-1">
            <input type="radio" name="party-payer-type" checked={values.payer_type === option.value} onChange={() => set({ payer_type: option.value })} />
            {option.label}
          </label>
        ))}
        {values.payer_type && (
          <button type="button" className="text-xs text-primary underline" onClick={() => set({ payer_type: '' })}>
            Clear
          </button>
        )}
      </fieldset>
    </>
  );
}

/**
 * The non-member-income party form (VEND-07, INC-S33). TDS is what the
 * party deducts from what it pays the society. `noun` is "Vendor" in Vendor
 * Master and "Payer" in Income Tracker.
 */
export function PartyFormFields({ values, set, showActive, noun = 'Vendor' }: { values: PartyFormValues; set: Set; showActive: boolean; noun?: string }): ReactNode {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">{noun} Details</h3>
      <div className="grid grid-cols-2 gap-4">
        <Text id="party-code" label={`${noun} ID`} maxLength={30} value={values.party_code} onChange={(party_code) => set({ party_code })} />
        <Text id="party-name" label={`${noun} Name *`} maxLength={255} value={values.name} onChange={(name) => set({ name })} />
        <Text id="party-contact" label={`${noun} Contact Name`} maxLength={255} value={values.contact_person} onChange={(contact_person) => set({ contact_person })} />
        <Text id="party-phone" label={`${noun} Phone`} value={values.phone} onChange={(phone) => set({ phone })} />
        <Text id="party-email" label={`${noun} Email`} value={values.email} onChange={(email) => set({ email })} />
        <Text id="party-alt-emails" label="Alternate Email(s)" maxLength={1000} value={values.alternate_emails} onChange={(alternate_emails) => set({ alternate_emails })} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="party-notes">Notes</Label>
        <Textarea id="party-notes" rows={2} maxLength={1000} value={values.notes} onChange={(e) => set({ notes: e.target.value })} />
      </div>
      {showActive && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={values.is_active} onChange={(e) => set({ is_active: e.target.checked })} /> Is {noun} Active?
        </label>
      )}
      <h3 className="text-sm font-semibold">{noun} Payment Information</h3>
      <InvoiceDefaults values={values} set={set} noun={noun} />
      <TdsFields values={values} set={set} />
      <div className="grid grid-cols-2 gap-4">
        <Text id="party-gstin" label="GSTIN" maxLength={15} value={values.gstin} onChange={(gstin) => set({ gstin })} />
        <Text id="party-pan" label="PAN No." maxLength={10} value={values.pan} onChange={(pan) => set({ pan })} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="party-address">Billing Address</Label>
        <Textarea id="party-address" rows={2} maxLength={1000} value={values.address} onChange={(e) => set({ address: e.target.value })} />
      </div>
      <h3 className="text-sm font-semibold">{noun} Bank Details</h3>
      <div className="grid grid-cols-2 gap-4">
        <Text id="party-account" label="Bank Account No." value={values.bank_account_number} onChange={(bank_account_number) => set({ bank_account_number })} />
        <Text id="party-bank" label="Bank Name" value={values.bank_name} onChange={(bank_name) => set({ bank_name })} />
        <Text id="party-branch" label="Branch" value={values.bank_branch} onChange={(bank_branch) => set({ bank_branch })} />
        <Text id="party-ifsc" label="Bank NEFT/IFSC Code" maxLength={11} value={values.bank_ifsc} onChange={(bank_ifsc) => set({ bank_ifsc })} />
      </div>
    </div>
  );
}
