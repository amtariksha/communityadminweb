'use client';

import { useState, type ReactNode } from 'react';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { useHelpdeskAssignees, useHelpdeskCategories, useServicedByOptions, type Ticket } from '@/hooks';
import { useAdminLayout } from '@/lib/layout-context';
import { serviceDateRange } from '@/lib/service-date';
import { statusChoices, ticketStatusLabel } from '@/lib/ticket-status';
import { AssetPicker } from './asset-picker';
import { recordChanges, recordValuesOf, type RecordChanges, type RecordValues } from './record-values';

interface RecordEditProps {
  ticket: Ticket;
  canEdit: boolean;
  isSaving: boolean;
  onSave: (changes: RecordChanges) => Promise<void>;
}

type Set = (changes: Partial<RecordValues>) => void;

function Field({ id, label, children }: { id: string; label: string; children: ReactNode }): ReactNode {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

function CategoryFields({ values, set, disabled }: { values: RecordValues; set: Set; disabled: boolean }): ReactNode {
  const categories = useHelpdeskCategories().data ?? [];
  const subcategories = categories.find((category) => category.id === values.categoryId)?.subcategories ?? [];
  return (
    <>
      <Field id="record-category" label="Category">
        <Select id="record-category" value={values.categoryId} disabled={disabled} onChange={(event) => set({ categoryId: event.target.value, subcategoryId: '' })}>
          {values.categoryId === '' && <option value="">Choose a category</option>}
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field id="record-subcategory" label="Sub-category">
        <Select id="record-subcategory" value={values.subcategoryId} disabled={disabled || subcategories.length === 0} onChange={(event) => set({ subcategoryId: event.target.value })}>
          <option value="">None</option>
          {subcategories.map((sub) => (
            <option key={sub.id} value={sub.id}>
              {sub.name}
            </option>
          ))}
        </Select>
      </Field>
    </>
  );
}

function PeopleFields({ values, set, disabled }: { values: RecordValues; set: Set; disabled: boolean }): ReactNode {
  const staff = useServicedByOptions();
  const admins = useHelpdeskAssignees().data ?? [];
  return (
    <>
      <Field id="record-serviced-by" label="Serviced By">
        <Select id="record-serviced-by" value={values.servicedBy} disabled={disabled || !staff.isSuccess} onChange={(event) => set({ servicedBy: event.target.value })}>
          <option value="">Unassigned</option>
          {(staff.data ?? []).map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field id="record-driven-by" label="Driven By">
        <Select id="record-driven-by" value={values.drivenBy} disabled={disabled} onChange={(event) => set({ drivenBy: event.target.value })}>
          {values.drivenBy === '' && <option value="">Unassigned</option>}
          {admins.map((admin) => (
            <option key={admin.user_id} value={admin.user_id}>
              {admin.name ?? 'Unnamed'}
            </option>
          ))}
        </Select>
      </Field>
    </>
  );
}

/**
 * The edit block of the request record (HELP-S9): every field, one Save
 * Changes sending one PATCH of what changed.
 */
export function RecordEdit({ ticket, canEdit, isSaving, onSave }: RecordEditProps): ReactNode {
  const layout = useAdminLayout();
  const categories = useHelpdeskCategories().data ?? [];
  const loaded = recordValuesOf(ticket);
  const [values, setValues] = useState<RecordValues>(loaded);
  const set: Set = (changes) => setValues((current) => ({ ...current, ...changes }));
  const disabled = !canEdit || isSaving;
  const defaultPriority = (categoryId: string): string =>
    categories.find((category) => category.id === categoryId)?.default_priority ?? 'medium';
  const changes = recordChanges(loaded, values, defaultPriority);
  const range = serviceDateRange();

  return (
    <section aria-label="Edit request" className="space-y-4 print:hidden">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <CategoryFields values={values} set={set} disabled={disabled} />
        <Field id="record-service-date" label="Preferred service date">
          <Input id="record-service-date" type="date" min={range.min} max={range.max} value={values.serviceDate} disabled={disabled} onChange={(event) => set({ serviceDate: event.target.value })} />
        </Field>
        <Field id="record-status" label="Status">
          <Select id="record-status" value={values.status} disabled={disabled} onChange={(event) => set({ status: event.target.value })}>
            {statusChoices(loaded.status).map((status) => (
              <option key={status} value={status}>
                {ticketStatusLabel(status, layout)}
              </option>
            ))}
          </Select>
        </Field>
        <PeopleFields values={values} set={set} disabled={disabled} />
        <AssetPicker
          value={values.assetId}
          currentName={ticket.related_to_name}
          current={ticket.linked_asset}
          disabled={disabled}
          onChange={(assetId) => set({ assetId })}
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={values.urgent} disabled={disabled} onChange={(event) => set({ urgent: event.target.checked })} />
        This is urgent!
      </label>
      {canEdit && (
        <Button type="button" disabled={isSaving || Object.keys(changes).length === 0} onClick={() => void onSave(changes)}>
          <Save className="mr-1 h-4 w-4" /> {isSaving ? 'Saving…' : 'Save Changes'}
        </Button>
      )}
    </section>
  );
}
