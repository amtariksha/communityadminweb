'use client';

import { useState, type ReactNode } from 'react';
import { FormFrame, type FormMode } from '@/components/form-page';
import { useToast } from '@/components/ui/toast';
import { useCreateMeeting, useUpdateMeeting, type MeetingItem } from '@/hooks';
import { useNextMeetingNumbers } from '@/hooks/use-meetings';
import { friendlyError } from '@/lib/api-error';
import { meetingFormError, meetingFormValues, meetingPayload, type MeetingFormValues } from './meeting-fields';
import { MeetingFormFields } from './meeting-form-fields';

export interface MeetingFormProps {
  mode: FormMode;
  /** Edit this meeting; absent to create one. */
  meeting?: MeetingItem | null;
  open?: boolean;
  onClose: () => void;
  onSaved: (meeting: MeetingItem) => void;
}

/** Titles; the create page shows the Meet.ID the meeting will most likely get (PROJ-20). */
function titles(mode: FormMode, meeting: MeetingItem | null | undefined, nextNo: number | undefined): { title: string; save: string } {
  if (meeting) {
    const base = mode === 'page' ? 'Edit Meeting' : 'Edit Committee Meeting';
    return { title: meeting.meeting_no ? `${base} — Meet.ID ${meeting.meeting_no}` : base, save: 'Save Changes' };
  }
  if (mode === 'dialog') return { title: 'Schedule Meeting', save: 'Schedule Meeting' };
  return { title: nextNo ? `Create a Meeting — Meet.ID ${nextNo}` : 'Create a Meeting', save: 'Create Meeting' };
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
  const next = useNextMeetingNumbers();
  const text = titles(props.mode, props.meeting, next.data?.meeting_no);

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
      description="Set date, time, duration, venue, notes and the agenda for the managing committee."
      onClose={props.onClose}
      onSave={() => void save()}
      saving={create.isPending || update.isPending}
      saveLabel={text.save}
      dialogClassName="sm:max-w-lg"
    >
      <MeetingFormFields values={values} set={set} />
    </FormFrame>
  );
}
