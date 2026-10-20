'use client';

import { type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePersonModules, type AdminPerson } from '@/hooks/use-access-control';
import { indiaDate, indiaDateTime } from '@/lib/india-time';
import type { PersonEdit } from './person-edits';

interface PersonPanelProps {
  person: AdminPerson;
  edit: PersonEdit;
  onEdit: (patch: PersonEdit) => void;
  onToggleActive: () => void;
  busy: boolean;
}

function ModuleSwitches({ person, edit, onEdit }: Pick<PersonPanelProps, 'person' | 'edit' | 'onEdit'>): ReactNode {
  const modules = usePersonModules(person.user_id, true);
  if (modules.isLoading) return <p className="text-xs text-muted-foreground">Loading modules…</p>;
  if (!modules.data) return <p className="text-xs text-muted-foreground">Module switches are not available yet on this server.</p>;
  const locked = modules.data.locked;
  const giveAll = () => onEdit({ modules: Object.fromEntries(modules.data!.modules.map((module) => [module.module_id, true])) });
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">Admin modules</span>
        {!locked && (
          <Button type="button" variant="outline" size="sm" onClick={giveAll}>
            Give All Module Access
          </Button>
        )}
        {locked && <span className="text-xs text-muted-foreground">A community admin always has every module.</span>}
      </div>
      <ul className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
        {modules.data.modules.map((module) => {
          const id = `module-${person.user_id}-${module.module_id}`;
          const on = edit.modules?.[module.module_id] ?? module.enabled;
          return (
            <li key={module.module_id}>
              <label htmlFor={id} className="flex items-center gap-2 text-sm">
                <input
                  id={id}
                  type="checkbox"
                  checked={on}
                  disabled={locked || person.status !== 'active'}
                  onChange={(event) => onEdit({ modules: { [module.module_id]: event.target.checked } })}
                />
                {module.label}
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** One person's access panel (UNIT-S8 / S9): designation, e-mail access, module switches, (de)activate. */
export function PersonPanel({ person, edit, onEdit, onToggleActive, busy }: PersonPanelProps): ReactNode {
  const designation = edit.designation !== undefined ? edit.designation ?? '' : person.designation ?? '';
  const emailOff = edit.email_access_disabled ?? person.email_access_disabled;
  return (
    <div className="space-y-3 border-t px-3 py-3">
      <dl className="grid gap-x-6 gap-y-1 text-xs sm:grid-cols-4">
        <div><dt className="text-muted-foreground">Phone</dt><dd>{person.phone}</dd></div>
        <div><dt className="text-muted-foreground">Email</dt><dd>{person.email ?? '—'}</dd></div>
        <div><dt className="text-muted-foreground">Joined On</dt><dd>{indiaDate(person.joined_on)}</dd></div>
        <div><dt className="text-muted-foreground">Last Login</dt><dd>{person.last_login_at ? indiaDateTime(person.last_login_at) : 'Never'}</dd></div>
      </dl>
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1">
          <Label htmlFor={`designation-${person.user_id}`}>Designation</Label>
          <Input
            id={`designation-${person.user_id}`}
            maxLength={60}
            placeholder="e.g. Secretary"
            value={designation}
            onChange={(event) => onEdit({ designation: event.target.value })}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={emailOff} onChange={(event) => onEdit({ email_access_disabled: event.target.checked })} />
          Disable email access (no admin e-mails)
        </label>
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={onToggleActive}>
          {person.status === 'active' ? 'Deactivate' : 'Re-activate'}
        </Button>
      </div>
      <ModuleSwitches person={person} edit={edit} onEdit={onEdit} />
    </div>
  );
}
