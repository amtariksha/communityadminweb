'use client';

import { type ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { useRequestChecklist, useTickChecklist, type ChecklistRequestKind } from '@/hooks/use-move-checklists';
import { ApiError, friendlyError } from '@/lib/api-error';
import { getCurrentTenant, getUser } from '@/lib/auth';
import { indiaDateTime } from '@/lib/india-time';

// MOVE-S2 / S3: the community admin and committee members keep the checklists.
const CHECKLIST_ROLES = ['community_admin', 'committee_member'];

/** Whether this user may tick (the API decides; this only shapes the screen). */
export function canTickChecklists(): boolean {
  const user = getUser();
  if (user?.isSuperAdmin) return true;
  const role = user?.societies.find((society) => society.id === getCurrentTenant())?.role;
  return role !== undefined && CHECKLIST_ROLES.includes(role);
}

/** The 409 of an approval or a step taken with checklist items unticked (decision MOVE-D6). */
export function incompleteChecklistMessage(error: unknown): string | null {
  return error instanceof ApiError && error.code === 'checklist_incomplete' ? error.message : null;
}

/** "n of m", or a dash when the API sends no count. */
export function checklistCount(row: { checklist_done?: number; checklist_total?: number }): string {
  if (row.checklist_done === undefined || row.checklist_total === undefined) return '—';
  return `${row.checklist_done} of ${row.checklist_total}`;
}

/**
 * MOVE-13 — a request's checklist: the enabled items (and any ticked on it
 * before being disabled), each with its tick. Nothing is shown when the
 * API does not have checklists yet.
 */
export function RequestChecklistPanel(props: { kind: ChecklistRequestKind; requestId: string; canTick: boolean }): ReactNode {
  const query = useRequestChecklist(props.kind, props.requestId);
  const tick = useTickChecklist(props.kind, props.requestId);
  const { addToast } = useToast();

  if (query.isLoading) return <Skeleton className="h-16 w-full" />;
  if (query.isError) return <p className="text-sm text-destructive">Could not load the checklist.</p>;
  if (!query.data) return null;
  const { items, done, total } = query.data;

  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold">
        Checklist ({done} of {total})
      </h3>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No checklist items.</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {items.map((item) => (
            <li key={item.item_id} className="flex items-start gap-2">
              <input
                type="checkbox"
                aria-label={item.label}
                checked={item.ticked}
                disabled={!props.canTick || tick.isPending || (!item.ticked && !item.is_enabled)}
                onChange={(event) =>
                  tick.mutate(
                    { item_id: item.item_id, ticked: event.target.checked },
                    { onError: (error) => addToast({ title: 'Could not save the tick', description: friendlyError(error), variant: 'destructive' }) },
                  )
                }
              />
              <span>
                {item.label}
                {item.ticked && item.ticked_at && (
                  <span className="block text-xs text-muted-foreground">
                    {indiaDateTime(item.ticked_at)}
                    {item.ticked_by_name ? ` · ${item.ticked_by_name}` : ''}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
