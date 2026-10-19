'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { UnitBlockLinks } from '@/components/block-links';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import {
  useApprovedUnitList,
  useApprovedUserList,
  type UnitListFilters,
  type UnitListItem,
  type UnitListView,
  type UnitTotals,
  type UnitUserItem,
} from '@/hooks/use-unit-panel';
import { isNotDeployed } from '@/lib/not-deployed';
import { cn } from '@/lib/utils';
import { blockUnitLabel, memberTypeLabel, unitPanelHref } from './unit-labels';

const SEARCH_DELAY_MS = 300;

interface ListRow {
  key: string;
  unitId: string;
  title: string;
  detail?: string;
}

function unitRow(unit: UnitListItem): ListRow {
  const owners = unit.owner_names ?? (unit.owner_name ? [unit.owner_name] : []);
  return {
    key: unit.id,
    unitId: unit.id,
    title: blockUnitLabel(unit),
    detail: owners.length > 0 ? `Owners: ${owners.join(', ')}` : undefined,
  };
}

function userRow(user: UnitUserItem): ListRow {
  return {
    key: user.member_id,
    unitId: user.unit_id,
    title: `${user.name ?? 'Unknown'} — ${blockUnitLabel(user)} — ${memberTypeLabel(user.member_type)}`,
  };
}

function ViewSwitch({ view, onChange }: { view: UnitListView; onChange: (view: UnitListView) => void }): ReactNode {
  const option = (value: UnitListView, label: string) => (
    <Button type="button" size="sm" variant={view === value ? 'default' : 'outline'} aria-pressed={view === value} onClick={() => onChange(value)}>
      {label}
    </Button>
  );
  return (
    <div role="group" aria-label="List" className="flex gap-1">
      {option('units', 'Units')}
      {option('users', 'Users')}
    </div>
  );
}

function SearchBox({ onChange }: { onChange: (value: string) => void }): ReactNode {
  const [draft, setDraft] = useState('');
  const settled = useDebouncedValue(draft, SEARCH_DELAY_MS);
  useEffect(() => onChange(settled.trim()), [settled, onChange]);
  return (
    <Input type="search" aria-label="Search By Units/Users" placeholder="Search By Units/Users" value={draft} onChange={(event) => setDraft(event.target.value)} />
  );
}

function TotalsBanner({ totals }: { totals?: UnitTotals }): ReactNode {
  if (!totals) return null;
  return (
    <p className="rounded-md bg-muted px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide">
      Total {totals.units} units and {totals.users} users
    </p>
  );
}

interface ListQuery {
  rows: ListRow[];
  totals?: UnitTotals;
  isLoading: boolean;
  error: unknown;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  /** An API from before UNIT-11 answers `view=users` with units. */
  unsupported: boolean;
}

function useListQuery(view: UnitListView, filters: UnitListFilters): ListQuery {
  const units = useApprovedUnitList(filters, view === 'units');
  const users = useApprovedUserList(filters, view === 'users');
  const active = view === 'units' ? units : users;
  const pages = active.data?.pages ?? [];
  const unitRows = (units.data?.pages ?? []).flatMap((page) => page.data);
  const userRows = (users.data?.pages ?? []).flatMap((page) => page.data);
  const unsupported = view === 'users' && userRows.some((row) => !row.member_id);
  return {
    rows: view === 'units' ? unitRows.map(unitRow) : unsupported ? [] : userRows.map(userRow),
    totals: pages[0]?.totals,
    isLoading: active.isLoading,
    error: active.error,
    hasNextPage: active.hasNextPage,
    isFetchingNextPage: active.isFetchingNextPage,
    fetchNextPage: () => void active.fetchNextPage(),
    unsupported,
  };
}

function ListBody({ list, view, selectedUnitId }: { list: ListQuery; view: UnitListView; selectedUnitId: string | null }): ReactNode {
  if (list.isLoading) return <Skeleton className="h-40 w-full" />;
  if (list.unsupported || isNotDeployed(list.error)) {
    return <p className="text-sm text-muted-foreground">The users list is not available yet on this server.</p>;
  }
  if (list.error) return <p role="alert" className="text-sm text-destructive">The list could not be loaded.</p>;
  if (list.rows.length === 0) {
    return <p className="text-sm text-muted-foreground">{view === 'units' ? 'No units match.' : 'No users match.'}</p>;
  }
  return (
    <ul aria-label={view === 'units' ? 'Units' : 'Users'} className="divide-y rounded-md border">
      {list.rows.map((row) => (
        <li key={row.key}>
          <Link
            href={unitPanelHref(row.unitId)}
            aria-current={row.unitId === selectedUnitId ? 'page' : undefined}
            className={cn('block px-3 py-2 text-sm hover:bg-muted', row.unitId === selectedUnitId && 'bg-muted font-semibold')}
          >
            <span className="block">{row.title}</span>
            {row.detail && <span className="block text-xs text-muted-foreground">{row.detail}</span>}
          </Link>
        </li>
      ))}
    </ul>
  );
}

/**
 * The left column of Approved Users (UNIT-S5): totals, search, the Units /
 * Users switch, block links and the list, 50 rows at a time.
 */
export function UnitList({ selectedUnitId }: { selectedUnitId: string | null }): ReactNode {
  const [view, setView] = useState<UnitListView>('units');
  const [search, setSearch] = useState('');
  const [block, setBlock] = useState<string | null>(null);
  const list = useListQuery(view, { search, block });

  return (
    <div className="space-y-3">
      <TotalsBanner totals={list.totals} />
      <SearchBox onChange={setSearch} />
      <ViewSwitch view={view} onChange={setView} />
      <UnitBlockLinks value={block} onChange={setBlock} />
      <ListBody list={list} view={view} selectedUnitId={selectedUnitId} />
      {list.hasNextPage && (
        <Button type="button" variant="outline" size="sm" className="w-full" disabled={list.isFetchingNextPage} onClick={list.fetchNextPage}>
          {list.isFetchingNextPage ? 'Loading…' : 'View More'}
        </Button>
      )}
    </div>
  );
}
