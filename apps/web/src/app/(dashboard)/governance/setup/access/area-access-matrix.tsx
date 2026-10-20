'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/toast';
import { useAreaMatrix, useSaveAreaMatrix, type AreaMatrix, type AreaPersonRow } from '@/hooks/use-module-areas';
import { friendlyError } from '@/lib/api-error';
import { isNotDeployed } from '@/lib/not-deployed';

const MODULE = 'issue_tracker';

type Ticks = Record<string, Record<string, boolean>>;

function ticksOf(matrix: AreaMatrix): Ticks {
  return Object.fromEntries(matrix.people.map((row) => [row.user_id, Object.fromEntries(Object.entries(row.areas).map(([area, cell]) => [area, cell.enabled]))]));
}

/** The rows whose ticks differ from the stored ones, as PUT sends them. */
export function changedRows(matrix: AreaMatrix, ticks: Ticks): Array<{ user_id: string; areas: Record<string, boolean> }> {
  return matrix.people.flatMap((row) => {
    const areas: Record<string, boolean> = {};
    for (const [area, cell] of Object.entries(row.areas)) {
      const ticked = ticks[row.user_id]?.[area] ?? cell.enabled;
      if (ticked !== cell.enabled) areas[area] = ticked;
    }
    return Object.keys(areas).length > 0 ? [{ user_id: row.user_id, areas }] : [];
  });
}

function Cell({ row, area, ticks, toggle }: { row: AreaPersonRow; area: string; ticks: Ticks; toggle: (userId: string, area: string) => void }): ReactNode {
  const cell = row.areas[area];
  if (!cell?.available) return <span className="text-xs text-muted-foreground" title="Their role does not reach this area">—</span>;
  return (
    <input
      type="checkbox"
      aria-label={`${row.name ?? 'Unnamed'}: ${area}`}
      checked={ticks[row.user_id]?.[area] ?? cell.enabled}
      disabled={row.locked}
      onChange={() => toggle(row.user_id, area)}
    />
  );
}

/**
 * Projects & Meetings › SetUp › Access Control (PROJ-S2): one row per
 * committee member and office staff, one tick per area. A tick only
 * narrows what the role allows (decision D1): "—" where the role does not
 * reach the area; community admins always keep every area.
 */
export function AreaAccessMatrix(): ReactNode {
  const router = useRouter();
  const { addToast } = useToast();
  const query = useAreaMatrix(MODULE);
  const save = useSaveAreaMatrix(MODULE);
  const [ticks, setTicks] = useState<Ticks>({});
  useEffect(() => {
    if (query.data) setTicks(ticksOf(query.data));
  }, [query.data]);
  const changes = useMemo(() => (query.data ? changedRows(query.data, ticks) : []), [query.data, ticks]);
  const toggle = (userId: string, area: string): void =>
    setTicks((current) => ({ ...current, [userId]: { ...current[userId], [area]: !current[userId]?.[area] } }));

  async function submit(): Promise<void> {
    try {
      await save.mutateAsync(changes);
      addToast({ title: 'Access saved', variant: 'success' });
    } catch (error) {
      addToast({ title: 'Could not save the access', description: friendlyError(error), variant: 'destructive' });
    }
  }

  function body(): ReactNode {
    if (isNotDeployed(query.error)) return <p className="text-sm text-muted-foreground">Access Control for Projects &amp; Meetings is not available yet.</p>;
    if ((query.error as { status?: number } | null)?.status === 403) return <p className="text-sm text-muted-foreground">Only a community admin can change this access.</p>;
    if (query.error) return <p role="alert" className="text-sm text-destructive">{friendlyError(query.error)}</p>;
    if (!query.data) return <Skeleton className="h-32 w-full" />;
    const { areas, people } = query.data;
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            {areas.map((area) => (
              <TableHead key={area.id}>{area.label}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {people.map((row) => (
            <TableRow key={row.user_id}>
              <TableCell>
                {row.name ?? 'Unnamed'}
                {row.locked && <span className="ml-1 text-xs text-muted-foreground">(community admin)</span>}
              </TableCell>
              {areas.map((area) => (
                <TableCell key={area.id}>
                  <Cell row={row} area={area.id} ticks={ticks} toggle={toggle} />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Access Control</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">Untick an area to take it away from a person; a tick never gives more than their role allows.</p>
        {body()}
        <div className="flex gap-2">
          <Button type="button" size="sm" disabled={changes.length === 0 || save.isPending} onClick={() => void submit()}>
            Save
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => router.push('/governance/setup')}>
            Close
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
