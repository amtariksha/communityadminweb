'use client';

import { useState, type ReactNode } from 'react';
import { FormFrame } from '@/components/form-page';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import { UserSearchSelect } from '@/components/ui/user-search-select';
import { useMeetings } from '@/hooks';
import { useCreateStandaloneTask, type CreateStandaloneTaskInput, type TaskRecurrence } from '@/hooks/use-meetings';
import { useTaskCategories } from '@/hooks/use-task-categories';
import type { UserSearchHit } from '@/hooks/use-user-search';
import { friendlyError } from '@/lib/api-error';
import { isNotDeployed } from '@/lib/not-deployed';

export interface AddTaskValues {
  title: string;
  description: string;
  category_id: string;
  due_date: string;
  meeting_id: string;
  /** PROJ-46 */
  recurrence: TaskRecurrence;
}

const EMPTY: AddTaskValues = { title: '', description: '', category_id: '', due_date: '', meeting_id: '', recurrence: 'none' };

export const RECURRENCES: ReadonlyArray<{ value: TaskRecurrence; label: string }> = [
  { value: 'none', label: 'None' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

/** The same rules as the API; null when valid. */
export function addTaskError(values: AddTaskValues): string | null {
  const title = values.title.trim();
  if (title.length < 2 || title.length > 255) return 'Describe the task in 2 to 255 characters.';
  if (values.description.length > 2000) return 'Details are at most 2,000 characters.';
  return null;
}

/** POST /meetings/tasks body: blanks left out or null. */
export function addTaskPayload(values: AddTaskValues, assignee: UserSearchHit | null): CreateStandaloneTaskInput {
  return {
    title: values.title.trim(),
    description: values.description.trim() || null,
    category_id: values.category_id || null,
    assignee_id: assignee?.id ?? null,
    due_date: values.due_date || null,
    meeting_id: values.meeting_id || null,
    // An API older than PROJ-46 drops it.
    ...(values.recurrence !== 'none' ? { recurrence: values.recurrence } : {}),
  };
}

function Field(props: { id: string; label: string; children: ReactNode }): ReactNode {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={props.id}>{props.label}</Label>
      {props.children}
    </div>
  );
}

function ChoiceFields({ values, set }: { values: AddTaskValues; set: (patch: Partial<AddTaskValues>) => void }): ReactNode {
  const categories = (useTaskCategories().data ?? []).filter((category) => category.is_active);
  const meetings = useMeetings('all').data ?? [];
  return (
    <div className="grid grid-cols-2 gap-3">
      <Field id="task-category" label="Category">
        <Select id="task-category" value={values.category_id} onChange={(e) => set({ category_id: e.target.value })}>
          <option value="">None</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field id="task-meeting" label="Meeting">
        <Select id="task-meeting" value={values.meeting_id} onChange={(e) => set({ meeting_id: e.target.value })}>
          <option value="">None</option>
          {meetings.map((meeting) => (
            <option key={meeting.id} value={meeting.id}>
              {meeting.meeting_no ? `${meeting.meeting_no} · ` : ''}
              {meeting.title}
            </option>
          ))}
        </Select>
      </Field>
    </div>
  );
}

/**
 * Add Task (PROJ-S12, PROJ-21): a task of its own — the meeting is optional
 * — with a category, an assignee and a due date. A dialog in both layouts.
 */
export function AddTaskDialog({ open, onClose }: { open: boolean; onClose: () => void }): ReactNode {
  const { addToast } = useToast();
  const create = useCreateStandaloneTask();
  const [values, setValues] = useState<AddTaskValues>(EMPTY);
  const [assignee, setAssignee] = useState<UserSearchHit | null>(null);
  const set = (patch: Partial<AddTaskValues>) => setValues((current) => ({ ...current, ...patch }));

  async function save(): Promise<void> {
    const problem = addTaskError(values);
    if (problem) return addToast({ title: 'Check the task', description: problem, variant: 'destructive' });
    try {
      await create.mutateAsync(addTaskPayload(values, assignee));
      addToast({ title: 'Task added', variant: 'success' });
      setValues(EMPTY);
      setAssignee(null);
      onClose();
    } catch (error) {
      const description = isNotDeployed(error) ? 'Adding a task here is not available yet.' : friendlyError(error);
      addToast({ title: 'Could not add the task', description, variant: 'destructive' });
    }
  }

  return (
    <FormFrame mode="dialog" open={open} title="Add Task" onClose={onClose} onSave={() => void save()} saving={create.isPending} saveLabel="Add Task" dialogClassName="sm:max-w-lg">
      <div className="grid gap-3 text-sm">
        <Field id="task-title" label="Description *">
          <Input id="task-title" maxLength={255} value={values.title} onChange={(e) => set({ title: e.target.value })} />
        </Field>
        <Field id="task-details" label="Details">
          <Textarea id="task-details" rows={3} maxLength={2000} value={values.description} onChange={(e) => set({ description: e.target.value })} />
        </Field>
        <ChoiceFields values={values} set={set} />
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Assigned To</Label>
            <UserSearchSelect scope="tenant" value={assignee} onChange={setAssignee} retainTypedOnNoMatch={false} noMatchHint="No one in this society matches." />
          </div>
          <Field id="task-due" label="Due Date">
            <Input id="task-due" type="date" value={values.due_date} onChange={(e) => set({ due_date: e.target.value })} />
          </Field>
        </div>
        <Field id="task-recurrence" label="Recurrence">
          <Select id="task-recurrence" value={values.recurrence} onChange={(e) => set({ recurrence: e.target.value as TaskRecurrence })}>
            {RECURRENCES.map((choice) => (
              <option key={choice.value} value={choice.value}>
                {choice.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
    </FormFrame>
  );
}
