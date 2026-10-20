'use client';

import type { ReactNode } from 'react';
import { isMeetingRouteMissing, useInvitablePeople, type InvitablePerson } from '@/hooks/use-meeting-invites';
import { AUDIENCES, REMINDERS, type MeetingFormValues } from './meeting-fields';

type Set = (patch: Partial<MeetingFormValues>) => void;

function PickList(props: { title: string; people: readonly InvitablePerson[]; picked: readonly string[]; toggle: (id: string) => void }): ReactNode {
  return (
    <fieldset className="space-y-1 rounded-md border p-2">
      <legend className="px-1 text-sm font-medium">{props.title}</legend>
      {props.people.length === 0 && <p className="text-xs text-muted-foreground">No one yet.</p>}
      {props.people.map((person) => (
        <label key={person.user_id} className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={props.picked.includes(person.user_id)} onChange={() => props.toggle(person.user_id)} />
          <span>{person.name ?? 'Unnamed'}</span>
          {person.designation && <span className="text-xs text-muted-foreground">{person.designation}</span>}
        </label>
      ))}
    </fieldset>
  );
}

/** Committee Members and Office Staff pick-lists (PROJ-S8): the people named on the invitation. */
function Invitees({ values, set }: { values: MeetingFormValues; set: Set }): ReactNode {
  const people = useInvitablePeople();
  if (isMeetingRouteMissing(people.error) || values.invitee_ids === null) {
    return <p className="text-xs text-muted-foreground">Naming invitees is not available yet.</p>;
  }
  if (!people.data) return null;
  const picked = values.invitee_ids;
  const toggle = (id: string): void => set({ invitee_ids: picked.includes(id) ? picked.filter((other) => other !== id) : [...picked, id] });
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <PickList title="Committee Members" people={people.data.committee} picked={picked} toggle={toggle} />
      <PickList title="Office Staff" people={people.data.office_staff} picked={picked} toggle={toggle} />
    </div>
  );
}

/**
 * Attendees (who the meeting is for), Send Alert (reminders, PROJ-43) and
 * the named invitees (PROJ-42). Nothing is sent from here: Invite sends the
 * invitations, and both go out only once a community admin has switched
 * them on in SetUp.
 */
export function MeetingInviteFields({ values, set }: { values: MeetingFormValues; set: Set }): ReactNode {
  return (
    <div className="grid gap-3 text-sm">
      <fieldset className="space-y-1">
        <legend className="font-medium">Attendees *</legend>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {AUDIENCES.map((audience) => (
            <label key={audience.value} className="flex items-center gap-1">
              <input type="radio" name="m-audience" value={audience.value} checked={values.audience === audience.value} onChange={() => set({ audience: audience.value })} />
              {audience.label}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="space-y-1">
        <legend className="font-medium">Send Alert</legend>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {REMINDERS.map((reminder) => (
            <label key={reminder.key} className="flex items-center gap-1">
              <input type="checkbox" checked={values[reminder.key]} onChange={(e) => set({ [reminder.key]: e.target.checked } as Partial<MeetingFormValues>)} />
              {reminder.label}
            </label>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Reminders go in the app, by push and by e-mail to the people invited, once a community admin switches meeting reminders on. SMS waits for the SMS channel.
        </p>
      </fieldset>
      <Invitees values={values} set={set} />
    </div>
  );
}
