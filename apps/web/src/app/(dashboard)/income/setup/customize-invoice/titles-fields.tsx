'use client';

import { type ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { TitlesErrors, TitlesField, TitlesForm } from './document-titles';

interface FieldsProps {
  form: TitlesForm;
  errors: TitlesErrors;
  change: (field: TitlesField, value: string) => void;
  disabled: boolean;
}

interface FieldSpec {
  field: TitlesField;
  label: string;
  maxLength?: number;
  type?: 'text' | 'date' | 'number';
  hint?: string;
  wide?: boolean;
}

const TITLES: FieldSpec[] = [
  { field: 'title_without_gst', label: 'Invoice Name without GST', maxLength: 40 },
  { field: 'title_with_gst', label: 'Invoice Name with GST', maxLength: 40, hint: 'Used once the society’s GSTIN applies and the invoice carries GST.' },
];

const ISSUER: FieldSpec[] = [
  { field: 'issuer_name', label: 'Association Name', maxLength: 120, hint: 'Blank prints the society’s name.', wide: true },
  { field: 'line1', label: 'Address Line 1', maxLength: 200 },
  { field: 'line2', label: 'Address Line 2', maxLength: 200 },
  { field: 'city', label: 'City', maxLength: 100 },
  { field: 'state', label: 'State', maxLength: 100 },
  { field: 'pincode', label: 'PinCode', maxLength: 6 },
  { field: 'phone', label: 'Phone', maxLength: 16 },
];

const OPTIONS: FieldSpec[] = [
  { field: 'service_tax_no', label: 'Service-tax registration no.', maxLength: 20, hint: 'Printed only on documents dated before 01-Jul-2017.' },
  { field: 'gstin_effective_from', label: 'GSTIN Effective From', type: 'date', hint: 'The GSTIN and the "with GST" title apply from this date.' },
  { field: 'show_last_receipts', label: 'Show Last Receipts in Invoice', type: 'number', hint: '0 to 10 of the unit’s latest receipts, under the totals.' },
];

function Field({ spec, form, errors, change, disabled }: FieldsProps & { spec: FieldSpec }): ReactNode {
  const id = `document-${spec.field.replace(/_/g, '-')}`;
  const error = errors[spec.field];
  return (
    <div className={spec.wide ? 'space-y-1 md:col-span-2' : 'space-y-1'}>
      <Label htmlFor={id}>{spec.label}</Label>
      <Input
        id={id}
        type={spec.type ?? 'text'}
        maxLength={spec.maxLength}
        min={spec.type === 'number' ? 0 : undefined}
        max={spec.type === 'number' ? 10 : undefined}
        value={form[spec.field]}
        disabled={disabled}
        onChange={(e) => change(spec.field, e.target.value)}
      />
      {error ? <p className="text-xs text-destructive">{error}</p> : spec.hint && <p className="text-xs text-muted-foreground">{spec.hint}</p>}
    </div>
  );
}

function Block({ title, specs, ...props }: FieldsProps & { title: string; specs: FieldSpec[] }): ReactNode {
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-semibold">{title}</legend>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {specs.map((spec) => (
          <Field key={spec.field} spec={spec} {...props} />
        ))}
      </div>
    </fieldset>
  );
}

/** The Document titles, Issuer and Invoice options blocks of Customize Invoice (INC-S8). */
export function TitlesFields(props: FieldsProps): ReactNode {
  return (
    <div className="space-y-6">
      <Block title="Document titles" specs={TITLES} {...props} />
      <Block title="Issuer" specs={ISSUER} {...props} />
      <Block title="Invoice options" specs={OPTIONS} {...props} />
    </div>
  );
}
