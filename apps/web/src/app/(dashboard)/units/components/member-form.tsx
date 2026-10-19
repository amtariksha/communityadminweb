'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { FormFrame, type FormMode } from '@/components/form-page';
import { FormFieldError } from '@/components/ui/form-field-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { UpdateMemberInput } from '@/hooks/use-unit-members';
import {
  ALTERNATE_ADDRESS_MAX,
  MEMBER_TYPE_OPTIONS,
  memberChanges,
  memberFormErrors,
  type MemberFormErrors,
  type MemberFormValues,
} from './member-form-values';

export interface MemberExtraValues {
  is_primary_contact: boolean;
  lives_here: boolean;
  is_association_member: boolean;
  alternate_address: string;
}

interface ExtraFieldsProps {
  values: MemberExtraValues;
  onChange: (next: MemberExtraValues) => void;
  /** The unit's current primary contact, when it is someone else. */
  otherPrimaryName?: string | null;
  error?: string;
  idPrefix: string;
}

function Check({ id, label, checked, onChange }: { id: string; label: string; checked: boolean; onChange: (value: boolean) => void }): ReactNode {
  return (
    <label htmlFor={id} className="flex items-center gap-2 text-sm">
      <input id={id} type="checkbox" className="h-4 w-4" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      {label}
    </label>
  );
}

/** UNIT-15 — Primary Contact, Lives Here, Association Member and Alternate Address (Add and Edit Member). */
export function MemberExtraFields({ values, onChange, otherPrimaryName, error, idPrefix }: ExtraFieldsProps): ReactNode {
  const set = (patch: Partial<MemberExtraValues>) => onChange({ ...values, ...patch });
  return (
    <fieldset className="space-y-2">
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <Check id={`${idPrefix}-primary`} label="Primary Contact" checked={values.is_primary_contact} onChange={(v) => set({ is_primary_contact: v })} />
        <Check id={`${idPrefix}-lives`} label="Lives Here" checked={values.lives_here} onChange={(v) => set({ lives_here: v })} />
        <Check
          id={`${idPrefix}-assoc`}
          label="Association Member"
          checked={values.is_association_member}
          onChange={(v) => set({ is_association_member: v })}
        />
      </div>
      {values.is_primary_contact && otherPrimaryName && (
        <p className="text-xs text-muted-foreground" role="note">
          This unit already has a primary contact ({otherPrimaryName}); saving moves it to this member.
        </p>
      )}
      <div className="space-y-1">
        <Label htmlFor={`${idPrefix}-address`}>Alternate Address</Label>
        <Textarea
          id={`${idPrefix}-address`}
          rows={2}
          maxLength={ALTERNATE_ADDRESS_MAX}
          value={values.alternate_address}
          onChange={(event) => set({ alternate_address: event.target.value })}
        />
        <FormFieldError message={error} />
      </div>
    </fieldset>
  );
}

interface MemberFormProps {
  mode: FormMode;
  open?: boolean;
  initial: MemberFormValues;
  otherPrimaryName?: string | null;
  saving?: boolean;
  onClose: () => void;
  onSave: (changes: Omit<UpdateMemberInput, 'unitId' | 'memberId'>) => void;
}

function TextField(props: { id: string; label: string; value: string; error?: string; type?: string; onChange: (value: string) => void }): ReactNode {
  return (
    <div className="space-y-1">
      <Label htmlFor={props.id}>{props.label}</Label>
      <Input id={props.id} type={props.type ?? 'text'} value={props.value} onChange={(event) => props.onChange(event.target.value)} />
      <FormFieldError message={props.error} />
    </div>
  );
}

/** Edit Member (UNIT-S7): dialog in standard, page in classic (SB-07). */
export function MemberForm({ mode, open, initial, otherPrimaryName, saving, onClose, onSave }: MemberFormProps): ReactNode {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<MemberFormErrors>({});
  useEffect(() => setValues(initial), [initial]);
  const set = (patch: Partial<MemberFormValues>) => setValues((current) => ({ ...current, ...patch }));
  const tenantSide = values.member_type === 'tenant' || values.member_type === 'tenant_family';

  function save(): void {
    const found = memberFormErrors(values);
    setErrors(found);
    if (Object.keys(found).length === 0) onSave(memberChanges(initial, values));
  }

  return (
    <FormFrame mode={mode} open={open} title="Edit Member" onClose={onClose} onSave={save} saving={saving}>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField id="member-name" label="Name" value={values.name} error={errors.name} onChange={(name) => set({ name })} />
        <TextField id="member-phone" label="Phone/Mobile" value={values.phone} error={errors.phone} onChange={(phone) => set({ phone })} />
        <TextField id="member-email" label="Email" type="email" value={values.email} error={errors.email} onChange={(email) => set({ email })} />
        <div className="space-y-1">
          <Label htmlFor="member-type">Resident Type</Label>
          <select
            id="member-type"
            className="h-9 w-full rounded-md border bg-background px-2 text-sm"
            value={values.member_type}
            onChange={(event) => set({ member_type: event.target.value })}
          >
            {MEMBER_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        {tenantSide && (
          <TextField id="member-lease" label="Lease End Date" type="date" value={values.lease_end_date} onChange={(lease_end_date) => set({ lease_end_date })} />
        )}
        <TextField
          id="member-birthdate"
          label="Birthdate"
          type="date"
          value={values.birthdate}
          error={errors.birthdate}
          onChange={(birthdate) => set({ birthdate })}
        />
      </div>
      <MemberExtraFields
        idPrefix="member"
        values={values}
        otherPrimaryName={initial.is_primary_contact ? null : otherPrimaryName}
        error={errors.alternate_address}
        onChange={(extra) => set(extra)}
      />
    </FormFrame>
  );
}
