'use client';

import Link from 'next/link';
import { type ReactNode } from 'react';
import { FormFrame } from '@/components/form-page';
import { FormFieldError } from '@/components/ui/form-field-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import type { DomesticStaff } from '@/hooks/use-staff-register';
import { RecordFields } from '../employee-form/record-fields';
import { UnitsPicker } from './units-picker';
import { useDomesticForm } from './use-domestic-form';

type Form = ReturnType<typeof useDomesticForm>;

interface DomesticFormProps {
  /** The helper being edited; none = Add. */
  saved?: DomesticStaff | null;
  onClose: () => void;
  onSaved: () => void;
}

function TextField({ id, label, value, onChange, disabled }: { id: string; label: string; value: string; onChange: (value: string) => void; disabled?: boolean }): ReactNode {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function CategoryField({ form }: { form: Form }): ReactNode {
  const { draft, set, categories } = form;
  if (!categories) {
    return <p className="text-sm text-muted-foreground">{form.categoriesLoading ? 'Loading categories…' : 'Household-help categories are not available yet.'}</p>;
  }
  return (
    <div className="space-y-2">
      <Label htmlFor="domestic-category">Staff Category</Label>
      <Select id="domestic-category" value={draft.categoryId} onChange={(event) => set('categoryId', event.target.value)}>
        <option value="">Choose a category</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </Select>
      <FormFieldError error={form.error} field="category_id" />
    </div>
  );
}

function DomesticFields({ form }: { form: Form }): ReactNode {
  const { draft, set } = form;
  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        <TextField id="domestic-name" label="Name" value={draft.name} onChange={(value) => set('name', value)} />
        <div className="space-y-2">
          <TextField id="domestic-phone" label="Contact No." value={draft.phone} disabled={form.editing} onChange={(value) => set('phone', value)} />
          <FormFieldError error={form.error} field="phone" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        <CategoryField form={form} />
        <div className="space-y-2">
          <Label htmlFor="domestic-joined">Join Date</Label>
          <Input id="domestic-joined" type="date" value={draft.joinedAt} onChange={(event) => set('joinedAt', event.target.value)} />
        </div>
      </div>
      <UnitsPicker value={draft.units} onChange={(units) => set('units', units)} />
      <FormFieldError error={form.error} field="unit_ids" />
      <TextField id="domestic-address" label="Address" value={draft.address} onChange={(value) => set('address', value)} />
    </>
  );
}

/**
 * Add / Edit household help in Staff Manager (STAFF-42): a Domestic
 * category, the flats served and the same badge and profile fields as
 * society staff. Society staff use Add Staff.
 */
export function DomesticForm({ saved, onClose, onSaved }: DomesticFormProps): ReactNode {
  const form = useDomesticForm(saved);
  return (
    <FormFrame
      mode="page"
      title={saved ? 'Edit Household Help' : 'Add Household Help'}
      description={
        saved ? (
          'Update the helper’s record and the units they work in'
        ) : (
          <>
            Help paid by the flats (maids, drivers, cooks). Society staff:{' '}
            <Link className="underline" href="/staff/new">
              Add Staff
            </Link>
          </>
        )
      }
      onClose={onClose}
      onSave={() => form.save(onSaved)}
      onSaveAndNew={saved ? undefined : () => form.save(form.reset)}
      saving={form.saving}
      saveLabel={saved ? 'Save Changes' : 'Add Household Help'}
    >
      <DomesticFields form={form} />
      <RecordFields draft={form.record} set={form.setRecord} employee={saved} error={form.error} />
    </FormFrame>
  );
}
