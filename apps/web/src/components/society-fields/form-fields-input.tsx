'use client';

import { type ReactNode } from 'react';
import { useFormFields, type FieldDef, type FieldPhase, type FieldValue, type FormField } from '@/hooks/use-resident-fields';
import { SocietyFields } from './society-fields';

/** Owners and their family fill the owner fields; tenants and theirs the tenant fields. */
export function appliesFor(memberType: string): 'owner' | 'tenant' {
  return memberType === 'tenant' || memberType === 'tenant_family' ? 'tenant' : 'owner';
}

const asFormField = ({ id, key, label, type, choices, read_only }: FieldDef): FormField => ({ id, key, label, type, choices, read_only });

/** The values worth sending: blanks and derived fields are left out. */
export function filledValues(values: Readonly<Record<string, FieldValue>>): Record<string, FieldValue> {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => value !== null && value !== '' && !(Array.isArray(value) && value.length === 0)),
  );
}

/**
 * MOVE-15 — the society's fields on a create form (Add Member, Onboard
 * Tenant, Start Move-Out): the enabled fields for the person's type, empty.
 * Nothing is shown when none is switched on or the API is older.
 */
export function FormFieldsInput(props: {
  phase: FieldPhase;
  applies: 'owner' | 'tenant';
  values: Readonly<Record<string, FieldValue>>;
  onChange: (key: string, value: FieldValue) => void;
  errors?: Readonly<Record<string, string>>;
}): ReactNode {
  const query = useFormFields(props.phase, props.applies);
  const fields = (query.data ?? []).filter((def) => !def.read_only).map(asFormField);
  if (fields.length === 0) return null;
  return (
    <section className="space-y-2">
      <h4 className="text-sm font-semibold">Society fields</h4>
      <SocietyFields fields={fields} values={props.values} onChange={props.onChange} errors={props.errors} />
    </section>
  );
}
