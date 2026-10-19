'use client';

import { type ReactNode } from 'react';
import { FormFieldError } from '@/components/ui/form-field-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { Staff } from '@/hooks/use-staff';
import { formatDate } from '@/lib/utils';
import { GENDER_OPTIONS, VALIDITY_OPTIONS, validTillPreview, type StaffRecordDraft } from './staff-record';

interface RecordFieldsProps {
  draft: StaffRecordDraft;
  set: <K extends keyof StaffRecordDraft>(key: K, value: StaffRecordDraft[K]) => void;
  /** The saved employee on Edit. */
  employee?: Staff | null;
  /** The last save's error, for the badge field's message. */
  error: unknown;
}

function TextField({ id, label, value, max, onChange }: { id: string; label: string; value: string; max: number; onChange: (value: string) => void }): ReactNode {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} maxLength={max} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function BadgeFields({ draft, set, employee, error }: RecordFieldsProps): ReactNode {
  const validTill = validTillPreview(draft, employee);
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
      <div className="space-y-2">
        <Label htmlFor="emp-badge">Badge No.</Label>
        <Input id="emp-badge" maxLength={20} placeholder="Next free number" value={draft.badgeNo} onChange={(event) => set('badgeNo', event.target.value)} />
        <FormFieldError error={error} field="badge_no" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="emp-badge-issued">Badge Issued On</Label>
        <Input id="emp-badge-issued" type="date" value={draft.issuedOn} onChange={(event) => set('issuedOn', event.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="emp-badge-validity">Badge validity</Label>
        <Select id="emp-badge-validity" value={draft.validity} onChange={(event) => set('validity', event.target.value)}>
          {draft.validity === '' && <option value="">As saved</option>}
          {VALIDITY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </Select>
      </div>
      <div className="space-y-2">
        <span className="text-sm font-medium">Badge Valid Till</span>
        <p className="flex h-10 items-center text-sm" data-testid="badge-valid-till">{validTill ? formatDate(validTill) : 'No expiry'}</p>
      </div>
    </div>
  );
}

function ProfileFields({ draft, set, employee }: RecordFieldsProps): ReactNode {
  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        <div className="space-y-2">
          <Label htmlFor="emp-gender">Gender</Label>
          <Select id="emp-gender" value={draft.gender} onChange={(event) => set('gender', event.target.value)}>
            <option value="">Not given</option>
            {GENDER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </Select>
        </div>
        <TextField id="emp-qualification" label="Qualification" max={100} value={draft.qualification} onChange={(value) => set('qualification', value)} />
        <TextField id="emp-skills" label="Skills" max={200} value={draft.skills} onChange={(value) => set('skills', value)} />
        <TextField id="emp-languages" label="Languages" max={200} value={draft.languages} onChange={(value) => set('languages', value)} />
        <TextField id="emp-id-proof" label="Id proof number" max={50} value={draft.idProofNumber} onChange={(value) => set('idProofNumber', value)} />
        {employee && (
          <div className="space-y-2">
            <Label htmlFor="emp-left-on">Leaving Date</Label>
            <Input id="emp-left-on" type="date" value={draft.leftOn} onChange={(event) => set('leftOn', event.target.value)} />
          </div>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="emp-notes">Notes</Label>
        <Textarea id="emp-notes" rows={2} maxLength={1000} value={draft.notes} onChange={(event) => set('notes', event.target.value)} />
      </div>
    </>
  );
}

/** Badge No., issue date, validity and the profile (STAFF-20, screen STAFF-S3). */
export function RecordFields(props: RecordFieldsProps): ReactNode {
  return (
    <>
      <BadgeFields {...props} />
      <ProfileFields {...props} />
    </>
  );
}
