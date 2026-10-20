'use client';

import { useState, type ReactNode } from 'react';
import { ShowLogsButton } from '@/components/show-logs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { useSetUnitManagerActive, useUnitManagers, type UnitManager } from '@/hooks/use-unit-managers';
import { friendlyError } from '@/lib/api-error';
import { formatDate } from '@/lib/utils';
import { AddCaretakerForm } from './add-caretaker-form';

function matches(person: UnitManager, search: string): boolean {
  const text = search.trim().toLowerCase();
  if (!text) return true;
  return [person.name, person.phone, ...person.units.map((unit) => unit.label)].some((value) => value?.toLowerCase().includes(text));
}

function CaretakerTable({ people, onToggle, busy, empty }: { people: UnitManager[]; onToggle: (person: UnitManager) => void; busy: boolean; empty: string }): ReactNode {
  if (people.length === 0) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b text-left">
          <th className="py-1">Name</th>
          <th className="py-1">Block-Unit(s) managed</th>
          <th className="py-1">Since</th>
          <th className="py-1">Action</th>
        </tr>
      </thead>
      <tbody>
        {people.map((person) => (
          <tr key={person.user_id} className="border-b">
            <td className="py-1">{person.name ?? person.phone}</td>
            <td className="py-1">
              {person.units.map((unit) => (unit.valid_until ? `${unit.label} (until ${formatDate(unit.valid_until)})` : unit.label)).join(', ')}
            </td>
            <td className="py-1">{formatDate(person.since)}</td>
            <td className="py-1">
              <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => onToggle(person)}>
                {person.status === 'active' ? 'Deactivate' : 'Re-activate'}
              </Button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Units & Users › Access Control › Care Taker / Unit Manager (UNIT-30 / UNIT-S10). */
export function Caretakers(): ReactNode {
  const query = useUnitManagers();
  const setActive = useSetUnitManagerActive();
  const { addToast } = useToast();
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);

  function toggle(person: UnitManager): void {
    const active = person.status !== 'active';
    if (!window.confirm(active ? 'Give back their access to the units they manage?' : 'Deactivate? They lose access to every unit they manage.')) return;
    setActive.mutate(
      { userId: person.user_id, active },
      { onError: (error) => addToast({ title: 'Could not change', description: friendlyError(error), variant: 'destructive' }) },
    );
  }

  if (query.isLoading) return <Skeleton className="h-40 w-full" />;
  if (query.data === null) return <p className="text-sm text-muted-foreground">Caretaker / unit manager logins are not available yet on this server.</p>;
  const people = (query.data ?? []).filter((person) => matches(person, search));
  const table = (status: UnitManager['status'], empty: string) => (
    <CaretakerTable people={people.filter((person) => person.status === status)} onToggle={toggle} busy={setActive.isPending} empty={empty} />
  );
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input type="search" aria-label="Search" placeholder="Search name, phone or unit" className="w-64" value={search} onChange={(event) => setSearch(event.target.value)} />
        <Button type="button" onClick={() => setAdding(true)}>Add New Caretaker / Unit Manager</Button>
        <ShowLogsButton recordTypes={['admin_access', 'rbac']} />
      </div>
      <section aria-label="Active" className="space-y-2">
        <h3 className="text-sm font-semibold">ACTIVE CARETAKER / UNIT MANAGER</h3>
        {table('active', 'No caretakers or unit managers.')}
      </section>
      <section aria-label="Deactivated" className="space-y-2">
        <h3 className="text-sm font-semibold">DEACTIVATED CARETAKER / UNIT MANAGER</h3>
        {table('deactivated', 'No deactivated caretakers or unit managers.')}
      </section>
      {adding && <AddCaretakerForm open onClose={() => setAdding(false)} />}
    </div>
  );
}
