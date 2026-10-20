'use client';

import type { ReactNode } from 'react';
import { AccountSearchSelect } from '@/components/ui/account-search-select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { CategoryFormErrors, CategoryFormValues } from './category-form-state';

interface CategoryFieldsProps {
  values: CategoryFormValues;
  errors: CategoryFormErrors;
  onChange: (patch: Partial<CategoryFormValues>) => void;
}

function FieldError({ id, message }: { id: string; message?: string }): ReactNode {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="text-sm text-destructive">
      {message}
    </p>
  );
}

function NumberField(props: {
  id: string;
  label: string;
  value: string;
  error?: string;
  step?: string;
  placeholder?: string;
  onChange: (value: string) => void;
}): ReactNode {
  return (
    <div className="space-y-1">
      <Label htmlFor={props.id}>{props.label}</Label>
      <Input
        id={props.id}
        type="number"
        min={0}
        step={props.step ?? '1'}
        placeholder={props.placeholder}
        value={props.value}
        aria-invalid={Boolean(props.error)}
        aria-describedby={props.error ? `${props.id}-error` : undefined}
        onChange={(event) => props.onChange(event.target.value)}
      />
      <FieldError id={`${props.id}-error`} message={props.error} />
    </div>
  );
}

/** The fields of Add / Edit Category (RULE-S3): header, then the Warning and Penalty blocks. */
export function CategoryFields({ values, errors, onChange }: CategoryFieldsProps): ReactNode {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="category-title">Title</Label>
        <Input
          id="category-title"
          placeholder="Enter Title Here"
          maxLength={90}
          value={values.title}
          aria-invalid={Boolean(errors.title)}
          onChange={(event) => onChange({ title: event.target.value })}
        />
        <FieldError id="category-title-error" message={errors.title} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="category-description">Description</Label>
        <Textarea
          id="category-description"
          placeholder="Enter Description Here"
          rows={4}
          value={values.description}
          onChange={(event) => onChange({ description: event.target.value })}
        />
        <FieldError id="category-description-error" message={errors.description} />
      </div>
      <fieldset className="space-y-2 rounded-md border p-3">
        <legend className="px-1 text-sm font-semibold">Warning</legend>
        <NumberField id="warning-days" label="No of Days" value={values.warning_days} error={errors.warning_days} onChange={(warning_days) => onChange({ warning_days })} />
      </fieldset>
      <fieldset className="space-y-3 rounded-md border p-3">
        <legend className="px-1 text-sm font-semibold">Penalty</legend>
        <NumberField id="penalty-days" label="No of Days" value={values.penalty_days} error={errors.penalty_days} onChange={(penalty_days) => onChange({ penalty_days })} />
        <div className="space-y-1">
          <span className="text-sm font-medium">Penalty charge head</span>
          <AccountSearchSelect
            value={values.income_account_id}
            accountType={['income']}
            placeholder="Search income account..."
            onChange={(income_account_id) => onChange({ income_account_id })}
          />
          <FieldError id="income-account-error" message={errors.income_account_id} />
        </div>
        <div className="space-y-1">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={values.apply_gst} onChange={(event) => onChange({ apply_gst: event.target.checked })} />
            Apply GST
          </label>
          <p className="text-xs text-muted-foreground">18% GST (9% CGST + 9% SGST) is added to the penalty amount.</p>
        </div>
        <NumberField
          id="penalty-amount"
          label="Penalty amount"
          step="0.01"
          placeholder="Enter Amount Here"
          value={values.penalty_amount}
          error={errors.penalty_amount}
          onChange={(penalty_amount) => onChange({ penalty_amount })}
        />
      </fieldset>
    </div>
  );
}
