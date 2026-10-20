'use client';

import { useState, type ReactNode } from 'react';
import { FormFrame, type FormMode } from '@/components/form-page';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import { useUpdateMeeting } from '@/hooks';
import { useMarkAttendance } from '@/hooks/use-meeting-invites';
import type { MeetingDetail, MeetingItem } from '@/hooks/use-meetings';
import { friendlyError } from '@/lib/api-error';
import { formatDate } from '@/lib/utils';

export interface MeetingMinutesFormProps {
  mode: FormMode;
  /** The standard cards hand a list row (no invitees); the page the whole meeting. */
  meeting: MeetingItem & Partial<MeetingDetail>;
  /** Below the minutes on the page: linked resolutions (PROJ-48). */
  extra?: React.ReactNode;
  open?: boolean;
  onClose: () => void;
  /** `closed`: the meeting was closed with its minutes. */
  onSaved: (closed: boolean) => void;
}

function AttendanceTicks(props: {
  invitees: NonNullable<MeetingDetail['invitees']>;
  attended: ReadonlySet<string>;
  onChange: (next: ReadonlySet<string>) => void;
}): React.ReactNode {
  if (props.invitees.length === 0) return null;
  const toggle = (id: string): void => {
    const next = new Set(props.attended);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    props.onChange(next);
  };
  return (
    <fieldset className="space-y-1 pt-2">
      <legend className="font-medium">Attended</legend>
      {props.invitees.map((row) => (
        <label key={row.user_id} className="flex items-center gap-2">
          <input type="checkbox" checked={props.attended.has(row.user_id)} onChange={() => toggle(row.user_id)} />
          {row.name ?? 'Unnamed'}
        </label>
      ))}
    </fieldset>
  );
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
  const attendance = useMarkAttendance();
  const [minutes, setMinutes] = useState(meeting.minutes ?? '');
  const invitees = meeting.invitees ?? [];
  const [attended, setAttended] = useState<ReadonlySet<string>>(() => new Set(invitees.filter((row) => row.attended).map((row) => row.user_id)));
  const changed = invitees.filter((row) => row.attended !== attended.has(row.user_id));

  async function save(close: boolean): Promise<void> {
    try {
      // PROJ-42 — the ticks first: a closed meeting takes no more changes.
      if (changed.length > 0) {
        await attendance.mutateAsync({ meetingId: meeting.id, rows: changed.map((row) => ({ user_id: row.user_id, attended: attended.has(row.user_id) })) });
      }
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
      saving={update.isPending || attendance.isPending}
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
        <AttendanceTicks invitees={invitees} attended={attended} onChange={setAttended} />
        {props.extra}
      </div>
    </FormFrame>
  );
}
