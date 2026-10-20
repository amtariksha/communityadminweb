'use client';

import { type ReactNode } from 'react';
import { FormFrame, type FormMode } from '@/components/form-page';
import { FormFieldError } from '@/components/ui/form-field-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { UserSearchSelect } from '@/components/ui/user-search-select';
import type { Staff } from '@/hooks/use-staff';
import { STAFF_TYPE_OPTIONS } from '../staff-fields';
import { categoryOfRecord } from '@/hooks/use-staff-categories';
import { useEmployeeForm } from './use-employee-form';
import { RecordFields } from './record-fields';

export interface EmployeeFormProps {
  mode: FormMode;
  /** Dialog only: whether it is showing. */
  open?: boolean;
  /** The employee being edited; none = Add. */
  employee?: Staff | null;
  onClose: () => void;
  /** After a save; the page form goes back to its list. */
  onSaved: () => void;
}

type Form = ReturnType<typeof useEmployeeForm>;

function PhoneField({ form }: { form: Form }): ReactNode {
  const { draft, set } = form;
  if (form.editing) return <Input type="tel" disabled value={draft.phone} aria-label="Phone" />;
  const residentOf = draft.selected?.units.filter((unit) => unit.is_current).map((unit) => unit.unit_number) ?? [];
  return (
    <>
      <UserSearchSelect
        scope="tenant"
        value={draft.selected}
        placeholder="Phone or name (3+ chars)…"
        onChange={(hit) => {
          set('selected', hit);
          if (hit) {
            set('phone', hit.phone);
            if (hit.name && !draft.name) set('name', hit.name);
          }
        }}
        onQueryChange={(query) => set('phone', query)}
      />
      {residentOf.length > 0 && (
        <p className="text-xs text-amber-600">
          Already a resident of {residentOf.join(', ')}. Adding a staff role on top is supported but unusual.
        </p>
      )}
    </>
  );
}

function TextField({ id, label, value, onChange, placeholder }: { id: string; label: string; value: string; onChange: (value: string) => void; placeholder?: string }): ReactNode {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

/** STAFF-41: the society's Official categories; the fixed types against an older API. */
function CategoryField({ form }: { form: Form }): ReactNode {
  const { draft, set, categories } = form;
  if (!categories) {
    return (
      <div className="space-y-2">
        <Label htmlFor="emp-type">Staff Type</Label>
        <Select id="emp-type" value={draft.type} onChange={(event) => set('type', event.target.value)}>
          {STAFF_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </Select>
      </div>
    );
  }
  const current = categoryOfRecord(categories, { category_id: draft.categoryId || null, staff_type: draft.type });
  return (
    <div className="space-y-2">
      <Label htmlFor="emp-category">Staff Category</Label>
      <Select id="emp-category" value={current?.id ?? ''} onChange={(event) => set('categoryId', event.target.value)}>
        {!current && <option value="">Choose a category</option>}
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
            {category.grants_guard_role ? ' (guard app)' : ''}
          </option>
        ))}
      </Select>
      <FormFieldError error={form.error} field="category_id" />
    </div>
  );
}

function EmployeeFields({ form }: { form: Form }): ReactNode {
  const { draft, set } = form;
  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        <TextField id="emp-name" label="Name" placeholder="Full name" value={draft.name} onChange={(value) => set('name', value)} />
        <div className="space-y-2">
          <Label>Phone</Label>
          <PhoneField form={form} />
          <FormFieldError error={form.error} field="phone" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        <CategoryField form={form} />
        <TextField id="emp-designation" label="Designation" placeholder="e.g., Head Guard" value={draft.designation} onChange={(value) => set('designation', value)} />
      </div>
      <TextField id="emp-address" label="Address" placeholder="Home address" value={draft.address} onChange={(value) => set('address', value)} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        <div className="space-y-2">
          <Label htmlFor="emp-emergency">Emergency Contact</Label>
          <Input
            id="emp-emergency"
            type="tel"
            placeholder="10-digit phone"
            maxLength={10}
            inputMode="numeric"
            value={draft.emergency}
            onChange={(event) => set('emergency', event.target.value.replace(/\D/g, ''))}
          />
        </div>
        {!form.editing && (
          <div className="space-y-2">
            <Label htmlFor="emp-joined">Join Date</Label>
            <Input id="emp-joined" type="date" max={form.maxJoinDate} value={draft.joinedAt} onChange={(event) => set('joinedAt', event.target.value)} />
          </div>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="emp-salary">Monthly Salary (₹)</Label>
        <Input
          id="emp-salary"
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          placeholder="Optional"
          value={draft.salary}
          onChange={(event) => set('salary', event.target.value)}
        />
      </div>
    </>
  );
}

/**
 * Add / Edit Employee (STAFF-10, SB-07): the standard Staff page's dialog
 * and the classic Staff Manager's own page are this one form. Add keeps
 * Save and New on the page. STAFF-20 adds the badge and profile fields.
 */
export function EmployeeForm({ mode, open, employee, onClose, onSaved }: EmployeeFormProps): ReactNode {
  const form = useEmployeeForm(employee);
  const editing = Boolean(employee);
  return (
    <FormFrame
      mode={mode}
      open={open}
      title={editing ? (mode === 'page' ? 'Edit Staff' : 'Edit Employee') : mode === 'page' ? 'Add Staff' : 'Add Employee'}
      description={editing ? 'Update employee details' : 'Add a new staff member'}
      onClose={onClose}
      onSave={() => form.save(onSaved)}
      onSaveAndNew={mode === 'page' && !editing ? () => form.save(form.reset) : undefined}
      saving={form.saving}
      saveLabel={mode === 'page' ? (editing ? 'Save Changes' : 'Add Staff') : 'Save'}
    >
      <EmployeeFields form={form} />
      <RecordFields draft={form.record} set={form.setRecord} employee={employee} error={form.error} />
    </FormFrame>
  );
}
