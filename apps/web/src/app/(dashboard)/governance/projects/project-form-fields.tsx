'use client';

import type { ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useInvitablePeople } from '@/hooks/use-meeting-invites';
import { PROJECT_PRIORITY_LABELS, PROJECT_STATUS_LABELS, useProjectOptions, type ProjectPriority, type ProjectStatus } from '@/hooks/use-projects';
import type { ProjectFormValues } from './project-fields';

type Set = (patch: Partial<ProjectFormValues>) => void;

const SELECT = 'w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm';

function Field(props: { id: string; label: string; children: ReactNode }): ReactNode {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={props.id}>{props.label}</Label>
      {props.children}
    </div>
  );
}

/** Driven By: Unassigned + the society's committee members and office staff. */
function DrivenBySelect({ value, set, currentName }: { value: string; set: Set; currentName?: string | null }): ReactNode {
  const people = useInvitablePeople().data;
  const choices = [...(people?.committee ?? []), ...(people?.office_staff ?? [])];
  const known = choices.some((person) => person.user_id === value);
  return (
    <select id="p-driven-by" value={value} onChange={(e) => set({ driven_by: e.target.value })} className={SELECT}>
      <option value="">Unassigned</option>
      {value && !known && <option value={value}>{currentName ?? 'Current'}</option>}
      {choices.map((person) => (
        <option key={person.user_id} value={person.user_id}>
          {person.name ?? 'Unnamed'}
          {person.designation ? ` — ${person.designation}` : ''}
        </option>
      ))}
    </select>
  );
}

/** The project form's fields (PROJ-S5): Category, Topic, Status, Priority, Driven By, Start and Target dates. */
export function ProjectFormFields(props: { values: ProjectFormValues; set: Set; drivenByName?: string | null }): ReactNode {
  const { values, set } = props;
  const categories = useProjectOptions().data?.categories ?? [];
  return (
    <div className="grid gap-4 text-sm">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="p-category" label="Category *">
          <Input id="p-category" list="p-category-list" maxLength={60} value={values.category} onChange={(e) => set({ category: e.target.value })} />
          <datalist id="p-category-list">
            {categories.map((category) => (
              <option key={category} value={category} />
            ))}
          </datalist>
        </Field>
        <Field id="p-status" label="Status">
          <select id="p-status" value={values.status} onChange={(e) => set({ status: e.target.value as ProjectStatus })} className={SELECT}>
            {Object.entries(PROJECT_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field id="p-topic" label="Topic *">
        <Input id="p-topic" maxLength={255} value={values.topic} onChange={(e) => set({ topic: e.target.value })} />
      </Field>
      <fieldset className="space-y-1.5">
        <legend className="text-sm font-medium">Priority</legend>
        <div className="flex gap-4">
          {(Object.keys(PROJECT_PRIORITY_LABELS) as ProjectPriority[]).map((priority) => (
            <label key={priority} className="flex items-center gap-1">
              <input type="radio" name="p-priority" value={priority} checked={values.priority === priority} onChange={() => set({ priority })} />
              {PROJECT_PRIORITY_LABELS[priority]}
            </label>
          ))}
        </div>
      </fieldset>
      <Field id="p-driven-by" label="Driven By">
        <DrivenBySelect value={values.driven_by} set={set} currentName={props.drivenByName} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field id="p-start" label="Start Date">
          <Input id="p-start" type="date" value={values.start_date} onChange={(e) => set({ start_date: e.target.value })} />
        </Field>
        <Field id="p-target" label="Target Date">
          <Input id="p-target" type="date" value={values.target_date} onChange={(e) => set({ target_date: e.target.value })} />
        </Field>
      </div>
    </div>
  );
}
