'use client';

import { useState, type ReactNode } from 'react';
import { FormFrame, type FormMode } from '@/components/form-page';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import { useUpdateMeeting, type MeetingItem } from '@/hooks';
import { friendlyError } from '@/lib/api-error';
import { formatDate } from '@/lib/utils';

export interface MeetingMinutesFormProps {
  mode: FormMode;
  meeting: MeetingItem;
  open?: boolean;
  onClose: () => void;
  /** `closed`: the meeting was closed with its minutes. */
  onSaved: (closed: boolean) => void;
}

/**
 * Meeting Minutes (PROJ-S9 with today's minutes field): Save Minutes keeps
 * the meeting open; Save and Close Meeting records them and closes it
 * (status completed), which used to happen silently on every save.
 */
export function MeetingMinutesForm(props: MeetingMinutesFormProps): ReactNode {
  const { meeting } = props;
  const { addToast } = useToast();
  const update = useUpdateMeeting();
  const [minutes, setMinutes] = useState(meeting.minutes ?? '');

  async function save(close: boolean): Promise<void> {
    try {
      await update.mutateAsync({
        id: meeting.id,
        data: close ? { minutes, status: 'completed' } : { minutes },
      });
      addToast({ title: close ? 'Minutes saved and meeting closed' : 'Minutes saved', variant: 'success' });
      props.onSaved(close);
    } catch (error) {
      addToast({ title: 'Could not save the minutes', description: friendlyError(error), variant: 'destructive' });
    }
  }

  return (
    <FormFrame
      mode={props.mode}
      open={props.open}
      title="Meeting Minutes"
      description={`${meeting.title} · ${formatDate(meeting.meeting_date)}`}
      onClose={props.onClose}
      onSave={() => void save(false)}
      secondaryAction={{ label: 'Save and Close Meeting', onClick: () => void save(true) }}
      saving={update.isPending}
      saveLabel="Save Minutes"
      dialogClassName="sm:max-w-lg"
    >
      <div className="space-y-2 text-sm">
        <Label htmlFor="minutes-input">Official Decisions & Minutes</Label>
        <Textarea
          id="minutes-input"
          rows={8}
          maxLength={4000}
          placeholder="Decisions made, attendance, resolutions passed and the main points discussed"
          value={minutes}
          onChange={(event) => setMinutes(event.target.value)}
        />
      </div>
    </FormFrame>
  );
}
