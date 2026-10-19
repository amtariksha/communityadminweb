'use client';

import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DURATIONS, MAX_AGENDA_LINES, effectiveEndTime, type DurationChoice, type MeetingFormValues } from './meeting-fields';

type Set = (patch: Partial<MeetingFormValues>) => void;

function Field(props: { id: string; label: string; children: ReactNode }): ReactNode {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={props.id}>{props.label}</Label>
      {props.children}
    </div>
  );
}

const SELECT = 'w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm';

/** Time, Duration (1–5 hours, PROJ-23) and the end time it gives. */
function TimeFields({ values, set }: { values: MeetingFormValues; set: Set }): ReactNode {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Field id="m-start" label="Start Time *">
        <Input id="m-start" type="time" value={values.start_time} onChange={(e) => set({ start_time: e.target.value })} />
      </Field>
      <Field id="m-duration" label="Duration *">
        <select id="m-duration" value={values.duration} onChange={(e) => set({ duration: e.target.value as DurationChoice })} className={SELECT}>
          {DURATIONS.map((choice) => (
            <option key={choice.value} value={choice.value}>
              {choice.label}
            </option>
          ))}
        </select>
      </Field>
      {values.duration === 'custom' ? (
        <Field id="m-end" label="End Time *">
          <Input id="m-end" type="time" value={values.end_time} onChange={(e) => set({ end_time: e.target.value })} />
        </Field>
      ) : (
        <p className="col-span-2 text-xs text-muted-foreground">Ends at {effectiveEndTime(values)}</p>
      )}
    </div>
  );
}

/** Agenda 1, 2, … with Add More agenda (PROJ-S8, at most thirty lines). */
function AgendaFields({ values, set }: { values: MeetingFormValues; set: Set }): ReactNode {
  const change = (index: number, text: string) => set({ agenda: values.agenda.map((line, i) => (i === index ? text : line)) });
  const remove = (index: number) => set({ agenda: values.agenda.length > 1 ? values.agenda.filter((_, i) => i !== index) : [''] });
  return (
    <div className="space-y-2">
      {values.agenda.map((line, index) => (
        <div key={index} className="flex items-end gap-2">
          <div className="flex-1">
            <Field id={`m-agenda-${index}`} label={`Agenda ${index + 1}${index === 0 ? ' *' : ''}`}>
              <Input id={`m-agenda-${index}`} maxLength={500} value={line} onChange={(e) => change(index, e.target.value)} />
            </Field>
          </div>
          {values.agenda.length > 1 && (
            <Button type="button" variant="ghost" size="icon" aria-label={`Remove agenda ${index + 1}`} onClick={() => remove(index)}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      ))}
      {values.agenda.length < MAX_AGENDA_LINES && (
        <Button type="button" variant="outline" size="sm" onClick={() => set({ agenda: [...values.agenda, ''] })}>
          Add More agenda
        </Button>
      )}
    </div>
  );
}

/** The meeting form's fields (PROJ-S8): topic, date, venue, time and duration, status, notes, agenda lines. */
export function MeetingFormFields({ values, set }: { values: MeetingFormValues; set: Set }): ReactNode {
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
      <TimeFields values={values} set={set} />
      <Field id="m-status" label="Meeting Status">
        <select id="m-status" value={values.status} onChange={(e) => set({ status: e.target.value as MeetingFormValues['status'] })} className={SELECT}>
          <option value="scheduled">Scheduled</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </Field>
      <Field id="m-notes" label="Notes">
        <Textarea id="m-notes" rows={2} maxLength={4000} value={values.notes} onChange={(e) => set({ notes: e.target.value })} />
      </Field>
      <AgendaFields values={values} set={set} />
    </div>
  );
}
