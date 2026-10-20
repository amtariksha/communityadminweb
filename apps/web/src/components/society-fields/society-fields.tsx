'use client';

import { type ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import type { FieldValue, FormField } from '@/hooks/use-resident-fields';

/**
 * MOVE-15 — the society's own fields as form inputs: text (≤ 500), date,
 * single choice, multiple choice. Derived fields (Rental Agreement Status,
 * Copy of Photo ID Submitted) and a read-only form show their value only.
 */
export interface SocietyFieldsProps {
  fields: readonly FormField[];
  values: Readonly<Record<string, FieldValue>>;
  onChange?: (key: string, value: FieldValue) => void;
  readOnly?: boolean;
  errors?: Readonly<Record<string, string>>;
}

const SELECT_CLASS =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50';

export function displayValue(value: FieldValue | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  return Array.isArray(value) ? value.join(', ') : value;
}

function FieldInput({ field, value, disabled, onChange }: { field: FormField; value: FieldValue; disabled: boolean; onChange: (value: FieldValue) => void }): ReactNode {
  const id = `society-field-${field.key}`;
  if (field.type === 'multiple') {
    const picked = Array.isArray(value) ? value : [];
    return (
      <div role="group" aria-label={field.label} className="flex flex-wrap gap-3">
        {(field.choices ?? []).map((choice) => (
          <label key={choice} className="flex items-center gap-1 text-sm">
            <input
              type="checkbox"
              checked={picked.includes(choice)}
              disabled={disabled}
              onChange={(event) => onChange(event.target.checked ? [...picked, choice] : picked.filter((c) => c !== choice))}
            />
            {choice}
          </label>
        ))}
      </div>
    );
  }
  if (field.type === 'single') {
    return (
      <select id={id} aria-label={field.label} className={SELECT_CLASS} disabled={disabled} value={typeof value === 'string' ? value : ''} onChange={(event) => onChange(event.target.value || null)}>
        <option value="">Select...</option>
        {(field.choices ?? []).map((choice) => (
          <option key={choice} value={choice}>
            {choice}
          </option>
        ))}
      </select>
    );
  }
  return (
    <Input
      id={id}
      aria-label={field.label}
      type={field.type === 'date' ? 'date' : 'text'}
      maxLength={field.type === 'text' ? 500 : undefined}
      disabled={disabled}
      value={typeof value === 'string' ? value : ''}
      onChange={(event) => onChange(event.target.value || null)}
    />
  );
}

/** One row per field: its name, then its input (or its value when read-only). */
export function SocietyFields({ fields, values, onChange, readOnly = false, errors = {} }: SocietyFieldsProps): ReactNode {
  if (fields.length === 0) return <p className="text-sm text-muted-foreground">No society fields are switched on.</p>;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {fields.map((field) => {
        const value = values[field.key] ?? null;
        const fixed = readOnly || field.read_only || !onChange;
        return (
          <div key={field.key} className="space-y-1">
            <span className="text-sm font-medium">{field.label}</span>
            {fixed && field.read_only ? (
              <p className="text-sm">{displayValue(value)}</p>
            ) : (
              <FieldInput field={field} value={value} disabled={fixed} onChange={(next) => onChange?.(field.key, next)} />
            )}
            {errors[field.key] && (
              <p role="alert" className="text-xs text-destructive">
                {errors[field.key]}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** The values a form starts with, by key. */
export function initialValues(fields: readonly FormField[]): Record<string, FieldValue> {
  return Object.fromEntries(fields.map((field) => [field.key, field.value ?? null]));
}

/** Only the typed-in values, for a request body (derived ones are never sent). */
export function editableValues(fields: readonly FormField[], values: Readonly<Record<string, FieldValue>>): Record<string, FieldValue> {
  return Object.fromEntries(fields.filter((field) => !field.read_only).map((field) => [field.key, values[field.key] ?? null]));
}

/** Per-field messages from a 400 `field_value_invalid` (`errors["values.<key>"]`). */
export function fieldErrorsFrom(errors: Readonly<Record<string, string>> | undefined): Record<string, string> {
  return Object.fromEntries(
    Object.entries(errors ?? {})
      .filter(([path]) => path.startsWith('values.') || path.startsWith('fields.'))
      .map(([path, message]) => [path.replace(/^(values|fields)\./, ''), message]),
  );
}
