'use client';

import { useState, type ReactNode } from 'react';
import { FormFrame, type FormMode } from '@/components/form-page';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import { useCreateMeeting, useUpdateMeeting, type MeetingItem } from '@/hooks';
import { friendlyError } from '@/lib/api-error';
import { meetingFormError, meetingFormValues, meetingPayload, type MeetingFormValues } from './meeting-fields';

export interface MeetingFormProps {
  mode: FormMode;
  /** Edit this meeting; absent to create one. */
  meeting?: MeetingItem | null;
  open?: boolean;
  onClose: () => void;
  onSaved: (meeting: MeetingItem) => void;
}

function Field(props: { id: string; label: string; children: ReactNode }): ReactNode {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={props.id}>{props.label}</Label>
      {props.children}
    </div>
  );
}

function MeetingFields({ values, set }: { values: MeetingFormValues; set: (patch: Partial<MeetingFormValues>) => void }): ReactNode {
  return (
    <div className="grid gap-4 text-sm">
      <Field id="m-title" label="Meeting Title *">
        <Input id="m-title" maxLength={255} value={values.title} onChange={(e) => set({ title: e.target.value })} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field id="m-date" label="Meeting Date *">
          <Input id="m-date" type="date" value={values.meeting_date} onChange={(e) => set({ meeting_date: e.target.value })} />
        </Field>
        <Field id="m-location" label="Location / Venue">
          <Input id="m-location" maxLength={255} value={values.location} onChange={(e) => set({ location: e.target.value })} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field id="m-start" label="Start Time *">
          <Input id="m-start" type="time" value={values.start_time} onChange={(e) => set({ start_time: e.target.value })} />
        </Field>
        <Field id="m-end" label="End Time *">
          <Input id="m-end" type="time" value={values.end_time} onChange={(e) => set({ end_time: e.target.value })} />
        </Field>
      </div>
      <Field id="m-status" label="Meeting Status">
        <select
          id="m-status"
          value={values.status}
          onChange={(e) => set({ status: e.target.value as MeetingFormValues['status'] })}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
        >
          <option value="scheduled">Scheduled</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </Field>
      <Field id="m-agenda" label="Proposed Agenda Items">
        <Textarea id="m-agenda" rows={3} maxLength={4000} value={values.agenda} onChange={(e) => set({ agenda: e.target.value })} />
      </Field>
    </div>
  );
}

function titles(mode: FormMode, editing: boolean): { title: string; save: string } {
  if (editing) return { title: mode === 'page' ? 'Edit Meeting' : 'Edit Committee Meeting', save: 'Save Changes' };
  return mode === 'page' ? { title: 'Create a Meeting', save: 'Create Meeting' } : { title: 'Schedule Meeting', save: 'Schedule Meeting' };
}

/**
 * Schedule / edit a committee meeting (PROJ-S8 with today's fields): the
 * standard layout's dialog and the classic page, one form and one set of
 * rules (SB-07).
 */
export function MeetingForm(props: MeetingFormProps): ReactNode {
  const { addToast } = useToast();
  const create = useCreateMeeting();
  const update = useUpdateMeeting();
  const [values, setValues] = useState<MeetingFormValues>(() => meetingFormValues(props.meeting));
  const set = (patch: Partial<MeetingFormValues>) => setValues((current) => ({ ...current, ...patch }));
  const editing = Boolean(props.meeting);
  const text = titles(props.mode, editing);

  async function save(): Promise<void> {
    const problem = meetingFormError(values);
    if (problem) return addToast({ title: 'Check the meeting', description: problem, variant: 'destructive' });
    try {
      const saved = props.meeting
        ? await update.mutateAsync({ id: props.meeting.id, data: meetingPayload(values) })
        : await create.mutateAsync(meetingPayload(values));
      addToast({ title: editing ? 'Meeting updated' : 'Meeting scheduled', variant: 'success' });
      props.onSaved(saved);
    } catch (error) {
      addToast({ title: 'Could not save the meeting', description: friendlyError(error), variant: 'destructive' });
    }
  }

  return (
    <FormFrame
      mode={props.mode}
      open={props.open}
      title={text.title}
      description="Set date, time, location, and proposed agenda for the managing committee."
      onClose={props.onClose}
      onSave={() => void save()}
      saving={create.isPending || update.isPending}
      saveLabel={text.save}
      dialogClassName="sm:max-w-lg"
    >
      <MeetingFields values={values} set={set} />
    </FormFrame>
  );
}
