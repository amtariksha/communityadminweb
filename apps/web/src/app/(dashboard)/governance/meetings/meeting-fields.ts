import type { CreateMeetingInput, MeetingItem } from '@/hooks';
import { todayIST } from '@/lib/date';

export type MeetingFormValues = Required<Pick<CreateMeetingInput, 'title' | 'meeting_date' | 'start_time' | 'end_time'>> & {
  location: string;
  agenda: string;
  status: NonNullable<CreateMeetingInput['status']>;
};

export const DEFAULT_VENUE = 'Clubhouse Committee Boardroom';

/** A blank meeting, or the stored one to edit. Times are HH:MM. */
export function meetingFormValues(meeting?: MeetingItem | null): MeetingFormValues {
  if (!meeting) {
    return {
      title: '',
      meeting_date: todayIST(),
      start_time: '19:00',
      end_time: '20:30',
      location: DEFAULT_VENUE,
      agenda: '',
      status: 'scheduled',
    };
  }
  return {
    title: meeting.title,
    meeting_date: meeting.meeting_date,
    start_time: meeting.start_time.slice(0, 5),
    end_time: meeting.end_time.slice(0, 5),
    location: meeting.location ?? '',
    agenda: meeting.agenda ?? '',
    status: meeting.status,
  };
}

/** The same rules in the dialog and on the page (SB-07); null when valid. */
export function meetingFormError(values: MeetingFormValues): string | null {
  if (values.title.trim().length < 2) return 'Give the meeting a topic of at least 2 characters.';
  if (!values.meeting_date) return 'Choose the meeting date.';
  if (!values.start_time || !values.end_time) return 'Choose the start and end time.';
  if (values.end_time <= values.start_time) return 'The meeting must end after it starts.';
  return null;
}

export function meetingPayload(values: MeetingFormValues): CreateMeetingInput {
  return {
    title: values.title.trim(),
    meeting_date: values.meeting_date,
    start_time: values.start_time,
    end_time: values.end_time,
    location: values.location.trim() || null,
    agenda: values.agenda.trim() || null,
    status: values.status,
  };
}
