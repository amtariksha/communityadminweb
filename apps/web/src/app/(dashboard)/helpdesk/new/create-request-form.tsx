'use client';

import { useState, type ReactNode } from 'react';
import { FormFrame, type FormMode } from '@/components/form-page';
import { FormFieldError } from '@/components/ui/form-field-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import { useCreateTicket, useHelpdeskCategories, useTicketCategories, type Ticket } from '@/hooks';
import { friendlyError } from '@/lib/api-error';
import { serviceDateRange } from '@/lib/service-date';
import { useWord } from '@/lib/vocabulary';
import { categoryChoices } from '../../tickets/category-choices';
import { hasRequestErrors, MAX_TEXT, validateRequest, type RequestErrors } from './request-fields';
import { FilesField } from './request-files-field';
import { RequestTypeField } from './request-type-field';
import { EMPTY_REQUEST, requestBody, type RequestValues } from './request-values';
import { useRequestFiles } from './use-request-files';
import { useUnitChoices } from './use-unit-choices';

export interface CreateRequestFormProps {
  mode: FormMode;
  /** Dialog only. */
  open?: boolean;
  onClose: () => void;
  onSaved: (ticket: Ticket) => void;
}

type SetValues = (changes: Partial<RequestValues>) => void;

function PriorityField({ mode, values, set }: { mode: FormMode; values: RequestValues; set: SetValues }): ReactNode {
  if (mode === 'page') {
    return (
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={values.urgent} onChange={(event) => set({ urgent: event.target.checked })} />
        This is urgent!
      </label>
    );
  }
  return (
    <div className="space-y-2">
      <Label htmlFor="request-priority">Priority</Label>
      <Select id="request-priority" value={values.priority} onChange={(event) => set({ priority: event.target.value })}>
        <option value="">Category default</option>
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
        <option value="urgent">Urgent</option>
      </Select>
    </div>
  );
}

function ServiceDateField({ values, set, error }: { values: RequestValues; set: SetValues; error?: string }): ReactNode {
  const range = serviceDateRange();
  return (
    <div className="space-y-2">
      <Label htmlFor="request-service-date">Preferred service date (optional)</Label>
      <Input
        id="request-service-date"
        type="date"
        min={range.min}
        max={range.max}
        value={values.serviceDate}
        onChange={(event) => set({ serviceDate: event.target.value })}
      />
      {error && <FormFieldError message={error} />}
    </div>
  );
}

function TextField({ values, set, error }: { values: RequestValues; set: SetValues; error?: string }): ReactNode {
  return (
    <div className="space-y-2">
      <Label htmlFor="request-text">Write your Request</Label>
      <Textarea
        id="request-text"
        rows={5}
        maxLength={MAX_TEXT}
        placeholder="The first line becomes the request's title"
        value={values.text}
        onChange={(event) => set({ text: event.target.value })}
      />
      {error && <FormFieldError message={error} />}
    </div>
  );
}

function CategoryField({ values, set, choices, error }: {
  values: RequestValues;
  set: SetValues;
  choices: ReturnType<typeof categoryChoices>;
  error?: string;
}): ReactNode {
  return (
    <div className="space-y-2">
      <Label htmlFor="request-category">Category</Label>
      <Select id="request-category" value={values.category} onChange={(event) => set({ category: event.target.value })}>
        <option value="">Select category</option>
        {choices.map((choice) => (
          <option key={choice.value} value={choice.value}>
            {choice.label}
          </option>
        ))}
      </Select>
      {error && <FormFieldError message={error} />}
    </div>
  );
}

/**
 * Create Request (HELP-13, HELP-S5): the same fields and checks as a
 * classic page and as the standard dialog (SB-07). Request Type came with
 * HELP-15, Preferred Service Date with HELP-16; Sub-category joins with HELP-17.
 */
export function CreateRequestForm({ mode, open, onClose, onSaved }: CreateRequestFormProps): ReactNode {
  const { addToast } = useToast();
  const word = useWord();
  const create = useCreateTicket();
  const files = useRequestFiles();
  const units = useUnitChoices();
  const choices = categoryChoices(useHelpdeskCategories().data, useTicketCategories().data);
  const [values, setValues] = useState<RequestValues>(EMPTY_REQUEST);
  const [errors, setErrors] = useState<RequestErrors>({});
  const [saving, setSaving] = useState(false);
  const set: SetValues = (changes) => setValues((current) => ({ ...current, ...changes }));

  async function save(): Promise<void> {
    const found = validateRequest(values);
    setErrors(found);
    if (hasRequestErrors(found)) return;
    setSaving(true);
    try {
      const uploaded = await files.uploadAll();
      if (!uploaded) return;
      const result = await create.mutateAsync(requestBody(values, mode, choices, uploaded));
      addToast({ title: `${word('Ticket')} created successfully`, variant: 'success' });
      setValues(EMPTY_REQUEST);
      files.reset();
      onSaved(result.data);
    } catch (error) {
      addToast({ title: `Failed to create ${word('Ticket').toLowerCase()}`, description: friendlyError(error), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormFrame
      mode={mode}
      title={mode === 'page' ? 'Create a Request' : word('New Ticket')}
      description={mode === 'dialog' ? 'Create a new maintenance request or complaint' : undefined}
      open={open}
      onClose={onClose}
      onSave={() => void save()}
      saving={saving}
      saveLabel={mode === 'page' ? 'Submit' : `Create ${word('Ticket')}`}
      savingLabel={mode === 'page' ? 'Submitting…' : 'Creating...'}
      dialogClassName="max-w-lg"
    >
      <RequestTypeField
        requestType={values.requestType}
        unitId={values.unitId}
        units={units}
        unitError={errors.unit}
        onChange={set}
      />
      <TextField values={values} set={set} error={errors.text} />
      <FilesField files={files} />
      <CategoryField values={values} set={set} choices={choices} error={errors.category} />
      <ServiceDateField values={values} set={set} error={errors.serviceDate} />
      <PriorityField mode={mode} values={values} set={set} />
    </FormFrame>
  );
}
