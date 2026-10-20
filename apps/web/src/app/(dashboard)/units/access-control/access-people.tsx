'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { ShowLogsButton } from '@/components/show-logs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import {
  accessKeys,
  useAdminPeople,
  useSavePersonModules,
  useSetPersonActive,
  useUpdatePerson,
  type AdminPerson,
  type PersonKind,
  type PersonModules,
} from '@/hooks/use-access-control';
import { friendlyError } from '@/lib/api-error';
import { ROLE_LABELS } from '@/lib/role-catalogue';
import { AddPersonForm } from './add-person-form';
import { accessCount, moduleChanges, personChanges, withEdit, type PersonEdits } from './person-edits';
import { PersonPanel } from './person-panel';

const TITLES: Record<PersonKind, { add: string; empty: string; deactivatedEmpty: string }> = {
  committee: { add: 'Add Management Committee Member', empty: 'No committee members yet — Add Management Committee Member.', deactivatedEmpty: 'No deactivated committee members.' },
  office_staff: { add: 'Add New Staff', empty: 'No office staff.', deactivatedEmpty: 'No deactivated staff.' },
};

function matches(person: AdminPerson, search: string): boolean {
  const text = search.trim().toLowerCase();
  return !text || [person.name, person.phone, person.units].some((value) => value?.toLowerCase().includes(text));
}

interface RowProps {
  person: AdminPerson;
  edits: PersonEdits;
  setEdits: (next: (current: PersonEdits) => PersonEdits) => void;
  onToggleActive: (person: AdminPerson) => void;
  busy: boolean;
}

function PersonRow({ person, edits, setEdits, onToggleActive, busy }: RowProps): ReactNode {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const stored = queryClient.getQueryData<PersonModules>(accessKeys.modules(person.user_id))?.modules;
  const roles = person.roles.map((role) => ROLE_LABELS[role] ?? role).join(', ');
  return (
    <li className="rounded-md border">
      <button type="button" aria-expanded={open} className="flex w-full flex-wrap items-center gap-2 px-3 py-2 text-left text-sm" onClick={() => setOpen(!open)}>
        <span className="font-medium">{person.name ?? person.phone}</span>
        {person.designation && <span className="text-muted-foreground">({person.designation})</span>}
        <span className="text-muted-foreground">{[roles, person.units].filter(Boolean).join(' · ')}</span>
        {person.locked && <span className="text-xs text-muted-foreground">(Community Admin)</span>}
        <span className="ml-auto text-xs">{accessCount(person, stored, edits[person.user_id])} Access</span>
      </button>
      {open && (
        <PersonPanel
          person={person}
          edit={edits[person.user_id] ?? {}}
          busy={busy}
          onEdit={(patch) => setEdits((current) => withEdit(current, person.user_id, patch))}
          onToggleActive={() => onToggleActive(person)}
        />
      )}
    </li>
  );
}

function useSaveChanges(people: readonly AdminPerson[], edits: PersonEdits, clear: () => void) {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const update = useUpdatePerson();
  const modules = useSavePersonModules();
  return async function save(): Promise<void> {
    try {
      for (const person of people) {
        const edit = edits[person.user_id];
        if (!edit) continue;
        const changes = personChanges(person, edit);
        if (changes) await update.mutateAsync({ userId: person.user_id, changes });
        const stored = queryClient.getQueryData<PersonModules>(accessKeys.modules(person.user_id))?.modules ?? [];
        const rows = moduleChanges(stored, edit);
        if (rows.length > 0) await modules.mutateAsync({ userId: person.user_id, modules: { modules: rows } });
      }
      clear();
      addToast({ title: 'Changes saved. Module switches apply within a minute.', variant: 'success' });
    } catch (error) {
      addToast({ title: 'Could not save every change', description: friendlyError(error), variant: 'destructive' });
    }
  };
}

/** Units & Users › Access Control › Management Committee / Office Staff (UNIT-22 / UNIT-23). */
export function AccessPeople({ kind }: { kind: PersonKind }): ReactNode {
  const query = useAdminPeople(kind);
  const { addToast } = useToast();
  const setActive = useSetPersonActive();
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [edits, setEdits] = useState<PersonEdits>({});
  const people = (query.data ?? []).filter((person) => matches(person, search));
  const save = useSaveChanges(people, edits, () => setEdits({}));

  function toggleActive(person: AdminPerson): void {
    const active = person.status !== 'active';
    if (!window.confirm(active ? 'Give back their admin roles?' : 'Deactivate? Their admin roles are taken away (they keep their resident access).')) return;
    setActive.mutate(
      { userId: person.user_id, active },
      { onError: (error) => addToast({ title: 'Could not change', description: friendlyError(error), variant: 'destructive' }) },
    );
  }

  if (query.isLoading) return <Skeleton className="h-40 w-full" />;
  if (query.data === null) return <p className="text-sm text-muted-foreground">Access Control is not available yet on this server.</p>;
  const row = (person: AdminPerson) => (
    <PersonRow key={person.user_id} person={person} edits={edits} setEdits={setEdits} onToggleActive={toggleActive} busy={setActive.isPending} />
  );
  const active = people.filter((person) => person.status === 'active');
  const deactivated = people.filter((person) => person.status !== 'active');
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input type="search" aria-label="Search" placeholder="Search name, phone or unit" className="w-64" value={search} onChange={(event) => setSearch(event.target.value)} />
        <Button type="button" onClick={() => setAdding(true)}>{TITLES[kind].add}</Button>
        <Button type="button" variant="outline" disabled={Object.keys(edits).length === 0} onClick={() => void save()}>
          Save Changes
        </Button>
        <ShowLogsButton recordTypes={['admin_access', 'rbac']} />
      </div>
      <section aria-label="Active" className="space-y-2">
        <h3 className="text-sm font-semibold">ACTIVE</h3>
        {active.length === 0 ? <p className="text-sm text-muted-foreground">{TITLES[kind].empty}</p> : <ul className="space-y-2">{active.map(row)}</ul>}
      </section>
      <section aria-label="Deactivated" className="space-y-2">
        <h3 className="text-sm font-semibold">DEACTIVATED</h3>
        {deactivated.length === 0 ? <p className="text-sm text-muted-foreground">{TITLES[kind].deactivatedEmpty}</p> : <ul className="space-y-2">{deactivated.map(row)}</ul>}
      </section>
      {adding && <AddPersonForm kind={kind} open onClose={() => setAdding(false)} />}
    </div>
  );
}
