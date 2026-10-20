'use client';

import { useState, type ReactNode } from 'react';
import { FormFrame } from '@/components/form-page';
import { FormFieldError } from '@/components/ui/form-field-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { useAddPerson, type PersonKind } from '@/hooks/use-access-control';
import { friendlyError } from '@/lib/api-error';
import { normalizePhone } from '@/lib/validation';

const ROLES: Record<PersonKind, ReadonlyArray<[string, string]>> = {
  committee: [
    ['committee_member', 'Committee Member'],
    ['community_admin', 'Community Admin'],
    ['accountant', 'Accountant'],
    ['auditor', 'Auditor'],
    ['moderator', 'Moderator'],
  ],
  office_staff: [
    ['accountant', 'Accountant'],
    ['auditor', 'Auditor'],
    ['moderator', 'Moderator'],
    ['committee_member', 'Committee Member'],
    ['community_admin', 'Community Admin'],
  ],
};

/** Add Management Committee Member / Add New Staff (UNIT-S8 / S9). */
export function AddPersonForm({ kind, open, onClose }: { kind: PersonKind; open: boolean; onClose: () => void }): ReactNode {
  const add = useAddPerson();
  const { addToast } = useToast();
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState(ROLES[kind][0][0]);
  const [designation, setDesignation] = useState('');
  const [phoneError, setPhoneError] = useState<string>();

  function save(): void {
    const checked = normalizePhone(phone);
    if (!checked.ok || !checked.value) {
      setPhoneError(checked.ok ? 'Phone is required.' : checked.error);
      return;
    }
    add.mutate(
      { phone: checked.value, name: name.trim() || undefined, role, designation: designation.trim() || undefined, kind },
      {
        onSuccess: () => {
          addToast({ title: 'Added', variant: 'success' });
          onClose();
        },
        onError: (error) => addToast({ title: 'Could not add', description: friendlyError(error), variant: 'destructive' }),
      },
    );
  }

  return (
    <FormFrame
      mode="dialog"
      open={open}
      title={kind === 'committee' ? 'Add Management Committee Member' : 'Add New Staff'}
      onClose={onClose}
      onSave={save}
      saving={add.isPending}
    >
      <div className="space-y-1">
        <Label htmlFor="person-phone">Phone</Label>
        <Input id="person-phone" value={phone} onChange={(event) => setPhone(event.target.value)} />
        <FormFieldError message={phoneError} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="person-name">Name</Label>
        <Input id="person-name" value={name} onChange={(event) => setName(event.target.value)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="person-role">Role</Label>
        <Select id="person-role" value={role} onChange={(event) => setRole(event.target.value)}>
          {ROLES[kind].map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="person-designation">Designation</Label>
        <Input id="person-designation" maxLength={60} value={designation} onChange={(event) => setDesignation(event.target.value)} />
      </div>
    </FormFrame>
  );
}
