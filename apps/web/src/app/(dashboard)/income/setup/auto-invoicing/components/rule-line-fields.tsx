import type { ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { gstRatesFor } from './rule-text';
import type { RuleLineFormErrors, RuleLineFormValues } from './rule-line-values';

interface FieldsProps {
  values: RuleLineFormValues;
  errors: RuleLineFormErrors;
  change: <K extends keyof RuleLineFormValues>(key: K, value: RuleLineFormValues[K]) => void;
}

function Money({ id, label, field, step, props }: { id: string; label: string; field: 'rate_sqft1_month' | 'rate_sqft2_month' | 'unit_fee_month'; step: string; props: FieldsProps }): ReactNode {
  const error = props.errors[field];
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        min={0}
        step={step}
        value={props.values[field]}
        aria-invalid={error ? true : undefined}
        onChange={(e) => props.change(field, e.target.value)}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

/** Fees, GST, effective date, interest and HSN/SAC of a rule line (INC-S3). */
export function RuleLineFields(props: FieldsProps): ReactNode {
  const { values, errors, change } = props;
  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Money id="rule-fee-sqft1" label="Fee / Sq.ft 1 / Month" field="rate_sqft1_month" step="0.0001" props={props} />
        <Money id="rule-fee-sqft2" label="Fee / Sq.ft 2 / Month" field="rate_sqft2_month" step="0.0001" props={props} />
        <Money id="rule-unit-fee" label="Unit Fee / Month" field="unit_fee_month" step="0.01" props={props} />
      </div>
      <div className="flex flex-wrap items-end gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={values.gst_applicable} onChange={(e) => change('gst_applicable', e.target.checked)} />
          GST Applicable
        </label>
        {values.gst_applicable && (
          <div className="space-y-1">
            <Label htmlFor="rule-gst-rate">GST rate</Label>
            <Select id="rule-gst-rate" value={values.gst_rate} onChange={(e) => change('gst_rate', e.target.value)}>
              {gstRatesFor(values.effective_from).map((rate) => (
                <option key={rate} value={String(rate)}>
                  {rate}%
                </option>
              ))}
            </Select>
          </div>
        )}
      </div>
      <div className="max-w-xs space-y-1">
        <Label htmlFor="rule-effective-from">Effective date</Label>
        <Input
          id="rule-effective-from"
          type="date"
          value={values.effective_from}
          aria-invalid={errors.effective_from ? true : undefined}
          onChange={(e) => change('effective_from', e.target.value)}
        />
        {errors.effective_from && <p className="text-xs text-destructive">{errors.effective_from}</p>}
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={values.interest_applicable}
          onChange={(e) => change('interest_applicable', e.target.checked)}
        />
        Late Payment Interest Applicable?
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={values.hsn_update} onChange={(e) => change('hsn_update', e.target.checked)} />
          HSN/SAC Update
        </label>
        {values.hsn_update && (
          <Input
            aria-label="HSN/SAC code"
            className="w-36"
            inputMode="numeric"
            maxLength={8}
            value={values.hsn_sac}
            onChange={(e) => change('hsn_sac', e.target.value.replace(/\D/g, ''))}
          />
        )}
        {errors.hsn_sac && <p className="text-xs text-destructive">{errors.hsn_sac}</p>}
      </div>
    </>
  );
}
