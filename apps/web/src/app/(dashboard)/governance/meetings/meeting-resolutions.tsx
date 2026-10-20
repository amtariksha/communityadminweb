'use client';

import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toast';
import { useResolutions } from '@/hooks/use-governance';
import { useLinkResolution, type LinkedResolution } from '@/hooks/use-meeting-invites';
import { friendlyError } from '@/lib/api-error';

const SELECT = 'w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm';

/** "RES-0004 · Approve the lift modernisation (passed)". */
export function resolutionText(row: Pick<LinkedResolution, 'resolution_number' | 'title' | 'status'>): string {
  return `${row.resolution_number ? `${row.resolution_number} · ` : ''}${row.title} (${row.status})`;
}

/** Resolutions of a meeting, read only (View, PROJ-S7). */
export function ResolutionList({ rows }: { rows: readonly LinkedResolution[] }): ReactNode {
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">No resolution is linked to this meeting.</p>;
  return (
    <ul className="list-disc space-y-0.5 pl-5 text-sm">
      {rows.map((row) => (
        <li key={row.id}>{resolutionText(row)}</li>
      ))}
    </ul>
  );
}

/**
 * Link resolution on the minutes page (PROJ-48): the resolutions recorded
 * at this meeting, an Unlink on each, and a pick of the society's other
 * resolutions not yet linked to a meeting. Absent on an older API.
 */
export function LinkResolutions({ meetingId, linked }: { meetingId: string; linked: readonly LinkedResolution[] | undefined }): ReactNode {
  const { addToast } = useToast();
  const all = useResolutions().data?.data ?? [];
  const link = useLinkResolution();
  const [picked, setPicked] = useState('');
  if (!linked) return null;
  const free = all.filter((row) => !row.meeting_id && !linked.some((other) => other.id === row.id));
  const change = (resolutionId: string, on: boolean): void =>
    link.mutate(
      { meetingId, resolutionId, link: on },
      {
        onSuccess: () => setPicked(''),
        onError: (error) => addToast({ title: 'Could not change the link', description: friendlyError(error), variant: 'destructive' }),
      },
    );
  return (
    <div className="space-y-2 pt-2">
      <p className="font-medium">Resolutions</p>
      {linked.map((row) => (
        <div key={row.id} className="flex items-center justify-between gap-2">
          <span>{resolutionText(row)}</span>
          <Button type="button" variant="ghost" size="sm" disabled={link.isPending} onClick={() => change(row.id, false)}>
            Unlink
          </Button>
        </div>
      ))}
      <div className="flex items-end gap-2">
        <div className="flex-1 space-y-1">
          <Label htmlFor="link-resolution">Link resolution</Label>
          <select id="link-resolution" className={SELECT} value={picked} onChange={(e) => setPicked(e.target.value)}>
            <option value="">Choose a resolution</option>
            {free.map((row) => (
              <option key={row.id} value={row.id}>
                {resolutionText(row)}
              </option>
            ))}
          </select>
        </div>
        <Button type="button" variant="outline" size="sm" disabled={!picked || link.isPending} onClick={() => change(picked, true)}>
          Link
        </Button>
      </div>
    </div>
  );
}
