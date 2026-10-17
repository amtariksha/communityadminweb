'use client';

import { useState, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { FormFrame, type FormMode } from '@/components/form-page';
import { Button } from '@/components/ui/button';
import { FormFieldError } from '@/components/ui/form-field-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import { UnitSearchSelect } from '@/components/ui/unit-search-select';
import { UploadProgress } from '@/components/ui/upload-progress';
import { useCreateTicket, useHelpdeskCategories, useTicketCategories, type Ticket } from '@/hooks';
import { friendlyError } from '@/lib/api-error';
import { useWord } from '@/lib/vocabulary';
import { categoryChoices, type CategoryChoice } from '../../tickets/category-choices';
import { ACCEPT_ATTRIBUTE, MAX_TEXT, requestSubject, validateRequest, type RequestErrors } from './request-fields';
import { useRequestFiles, type AttachedFile, type UploadedFiles } from './use-request-files';
import { useUnitChoices } from './use-unit-choices';

export interface CreateRequestFormProps {
  mode: FormMode;
  /** Dialog only. */
  open?: boolean;
  onClose: () => void;
  onSaved: (ticket: Ticket) => void;
}

interface Values {
  unitId: string;
  text: string;
  category: string;
  // Classic: "This is urgent!"; standard: the Priority select ('' = category default).
  urgent: boolean;
  priority: string;
}

const EMPTY: Values = { unitId: '', text: '', category: '', urgent: false, priority: '' };

/** What to send for the chosen category: its id, and its name for an older server. */
function categoryFields(choices: readonly CategoryChoice[], value: string): { category_id?: string; category: string } {
  const choice = choices.find((entry) => entry.value === value);
  return choice?.categoryId ? { category_id: choice.categoryId, category: choice.label } : { category: value };
}

function requestBody(values: Values, mode: FormMode, choices: readonly CategoryChoice[], files: UploadedFiles) {
  const priority = mode === 'page' ? (values.urgent ? 'urgent' : '') : values.priority;
  return {
    subject: requestSubject(values.text),
    description: values.text.trim(),
    ...categoryFields(choices, values.category),
    ...(priority ? { priority } : {}),
    ...(values.unitId ? { unit_id: values.unitId } : {}),
    ...(files.urls.length > 0 ? { attachment_urls: files.urls, attachment_names: files.names } : {}),
  };
}

function FileRow({ entry, onRemove, onRetry }: { entry: AttachedFile; onRemove: () => void; onRetry: () => void }): ReactNode {
  const failed = entry.state === 'error';
  return (
    <li className={failed ? 'rounded border border-destructive p-2 text-sm' : 'rounded border p-2 text-sm'}>
      <div className="flex items-center justify-between gap-2">
        <span className="truncate">
          {entry.file.name} — {(entry.file.size / 1024).toFixed(1)} KB
        </span>
        <span className="flex items-center gap-1">
          {failed && (
            <Button type="button" size="sm" variant="outline" onClick={onRetry}>
              Retry
            </Button>
          )}
          <Button type="button" size="sm" variant="ghost" aria-label={`Remove ${entry.file.name}`} onClick={onRemove}>
            <X className="h-4 w-4" />
          </Button>
        </span>
      </div>
      {failed && <p className="text-xs text-destructive">Could not upload this file. Retry or remove it.</p>}
      <UploadProgress percent={entry.percent} fileName={entry.file.name} state={failed ? 'error' : entry.state === 'done' ? 'done' : 'uploading'} />
    </li>
  );
}

function FilesField({ files }: { files: ReturnType<typeof useRequestFiles> }): ReactNode {
  return (
    <div className="space-y-2">
      <Label htmlFor="request-files">Drag &amp; Drop your files or Browse (up to 5, 8 MB each)</Label>
      <Input
        id="request-files"
        type="file"
        multiple
        accept={ACCEPT_ATTRIBUTE}
        onChange={(event) => {
          files.add(Array.from(event.target.files ?? []));
          event.target.value = '';
        }}
      />
      {files.refused.length > 0 && (
        <div role="alert" className="text-sm text-destructive">
          {files.refused.map((reason) => (
            <p key={reason}>{reason}</p>
          ))}
        </div>
      )}
      {files.files.length > 0 && (
        <ul className="space-y-1">
          {files.files.map((entry) => (
            <FileRow key={entry.id} entry={entry} onRemove={() => files.remove(entry.id)} onRetry={() => void files.retry(entry)} />
          ))}
        </ul>
      )}
    </div>
  );
}

function PriorityField({ mode, values, set }: { mode: FormMode; values: Values; set: (changes: Partial<Values>) => void }): ReactNode {
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

/**
 * Create Request (HELP-13, HELP-S5): the same fields and checks as a
 * classic page and as the standard dialog (SB-07). Request Type and the
 * Sub-category and Preferred Service Date fields join with HELP-15/16/17.
 */
export function CreateRequestForm({ mode, open, onClose, onSaved }: CreateRequestFormProps): ReactNode {
  const { addToast } = useToast();
  const word = useWord();
  const create = useCreateTicket();
  const files = useRequestFiles();
  const units = useUnitChoices();
  const choices = categoryChoices(useHelpdeskCategories().data, useTicketCategories().data);
  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<RequestErrors>({});
  const [saving, setSaving] = useState(false);
  const set = (changes: Partial<Values>): void => setValues((current) => ({ ...current, ...changes }));

  async function save(): Promise<void> {
    const found = validateRequest(values.text, values.category);
    setErrors(found);
    if (found.text || found.category) return;
    setSaving(true);
    try {
      const uploaded = await files.uploadAll();
      if (!uploaded) return;
      const result = await create.mutateAsync(requestBody(values, mode, choices, uploaded));
      addToast({ title: `${word('Ticket')} created successfully`, variant: 'success' });
      setValues(EMPTY);
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
      <div className="space-y-2">
        <Label>Select Unit</Label>
        <UnitSearchSelect value={values.unitId} onChange={(unitId) => set({ unitId })} units={units.data ?? []} placeholder="Search unit (optional)" />
      </div>
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
        {errors.text && <FormFieldError message={errors.text} />}
      </div>
      <FilesField files={files} />
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
        {errors.category && <FormFieldError message={errors.category} />}
      </div>
      <PriorityField mode={mode} values={values} set={set} />
    </FormFrame>
  );
}
