import type { CreateMeetingInput, MeetingItem } from '@/hooks';
import { todayIST } from '@/lib/date';

/**
 * The meeting form's values, rules and request body (PROJ-11, PROJ-23):
 * a duration of 1 to 5 hours sets the end time (an older meeting whose
 * length is not whole hours keeps its own end time as "Other"), notes, and
 * one line per agenda item. Pure, so the dialog and the page share it.
 */
export type DurationChoice = '60' | '120' | '180' | '240' | '300' | 'custom';

export const DURATIONS: ReadonlyArray<{ value: DurationChoice; label: string }> = [
  { value: '60', label: '1 Hour' },
  { value: '120', label: '2 Hour' },
  { value: '180', label: '3 Hour' },
  { value: '240', label: '4 Hour' },
  { value: '300', label: '5 Hour' },
  { value: 'custom', label: 'Other end time' },
];

export const MAX_AGENDA_LINES = 30;

export type MeetingFormValues = Required<Pick<CreateMeetingInput, 'title' | 'meeting_date' | 'start_time' | 'end_time'>> & {
  duration: DurationChoice;
  location: string;
  notes: string;
  agenda: string[];
  status: NonNullable<CreateMeetingInput['status']>;
};

export const DEFAULT_VENUE = 'Clubhouse Committee Boardroom';

const minutesOf = (time: string): number => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));

/** `HH:MM` plus minutes, wrapping past midnight (as the API computes it). */
export function endTimeAfter(start: string, minutes: number): string {
  const end = (minutesOf(start) + minutes) % (24 * 60);
  return `${String(Math.floor(end / 60)).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}`;
}

function durationOf(meeting: MeetingItem): DurationChoice {
  const stored = meeting.duration_minutes ?? minutesOf(meeting.end_time) - minutesOf(meeting.start_time);
  const match = DURATIONS.find((choice) => choice.value === String(stored));
  return match ? match.value : 'custom';
}

function agendaOf(meeting: MeetingItem): string[] {
  if (meeting.agenda_items && meeting.agenda_items.length > 0) return [...meeting.agenda_items];
  return meeting.agenda ? [meeting.agenda] : [''];
}

/** A blank meeting, or the stored one to edit. Times are HH:MM. */
export function meetingFormValues(meeting?: MeetingItem | null): MeetingFormValues {
  if (!meeting) {
    return {
      title: '',
      meeting_date: todayIST(),
      start_time: '19:00',
      end_time: '20:00',
      duration: '60',
      location: DEFAULT_VENUE,
      notes: '',
      agenda: [''],
      status: 'scheduled',
    };
  }
  return {
    title: meeting.title,
    meeting_date: meeting.meeting_date,
    start_time: meeting.start_time.slice(0, 5),
    end_time: meeting.end_time.slice(0, 5),
    duration: durationOf(meeting),
    location: meeting.location ?? '',
    notes: meeting.notes ?? '',
    agenda: agendaOf(meeting),
    status: meeting.status,
  };
}

/** The end time the meeting will be saved with. */
export function effectiveEndTime(values: MeetingFormValues): string {
  return values.duration === 'custom' ? values.end_time : endTimeAfter(values.start_time, Number(values.duration));
}

const agendaLines = (values: MeetingFormValues): string[] => values.agenda.map((line) => line.trim()).filter(Boolean);

/** The same rules in the dialog and on the page (SB-07); null when valid. */
export function meetingFormError(values: MeetingFormValues): string | null {
  if (values.title.trim().length < 2) return 'Give the meeting a topic of at least 2 characters.';
  if (!values.meeting_date) return 'Choose the meeting date.';
  if (!values.start_time) return 'Choose the start time.';
  if (values.duration === 'custom' && (!values.end_time || values.end_time <= values.start_time)) {
    return 'The meeting must end after it starts.';
  }
  const lines = agendaLines(values);
  if (lines.length === 0) return 'Write at least one agenda line.';
  if (values.agenda.length > MAX_AGENDA_LINES) return `At most ${MAX_AGENDA_LINES} agenda lines.`;
  if (lines.some((line) => line.length > 500)) return 'An agenda line is at most 500 characters.';
  if (values.notes.length > 4000) return 'Notes are at most 4,000 characters.';
  return null;
}

export function meetingPayload(values: MeetingFormValues): CreateMeetingInput {
  const lines = agendaLines(values);
  return {
    title: values.title.trim(),
    meeting_date: values.meeting_date,
    start_time: values.start_time,
    // Sent too, so an API older than PROJ-23 keeps the right end time.
    end_time: effectiveEndTime(values),
    duration_minutes: values.duration === 'custom' ? null : Number(values.duration),
    location: values.location.trim() || null,
    notes: values.notes.trim() || null,
    // The lines, and joined for an API older than PROJ-23.
    agenda: lines.join('\n') || null,
    agenda_items: lines,
    status: values.status,
  };
}
