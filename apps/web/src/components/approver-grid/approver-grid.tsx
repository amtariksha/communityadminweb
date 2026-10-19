'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/toast';
import { useApproverGrid, useSaveApproverGrid, type ApproverGrid, type ApproverGridType } from '@/hooks/use-approver-grid';
import { friendlyError } from '@/lib/api-error';
import { ROLE_LABELS } from '@/lib/role-catalogue';
import { GRID_LEVELS, countAt, draftError, draftFrom, saveBody, type GridDraft } from './approver-grid-state';

export interface ApproverGridProps {
  type: ApproverGridType;
  /** First column heading, e.g. "Purchase Request Approvers". */
  peopleHeader: string;
  /** Only the community admin changes the grid; others read it. */
  canEdit: boolean;
}

const COLUMNS = [
  { level: 0, label: 'No Access' },
  ...GRID_LEVELS.map((level) => ({ level, label: `Level ${level}` })),
];

function roleText(roles: readonly string[]): string {
  return roles.map((slug) => ROLE_LABELS[slug] ?? slug).join(', ');
}

function PeopleTable(props: {
  grid: ApproverGrid;
  draft: GridDraft;
  peopleHeader: string;
  canEdit: boolean;
  onLevel: (userId: string, level: number) => void;
}): ReactNode {
  return (
    <Table aria-label={props.peopleHeader}>
      <TableHeader>
        <TableRow>
          <TableHead>{props.peopleHeader}</TableHead>
          {COLUMNS.map((column) => (
            <TableHead key={column.level} className="text-center">
              {column.label}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {props.grid.people.map((person) => (
          <TableRow key={person.user_id}>
            <TableCell>
              <div className="font-medium">{person.name ?? 'Unnamed user'}</div>
              <div className="text-xs text-muted-foreground">{roleText(person.roles)}</div>
            </TableCell>
            {COLUMNS.map((column) => (
              <TableCell key={column.level} className="text-center">
                <input
                  type="radio"
                  name={`level-${person.user_id}`}
                  aria-label={`${person.name ?? 'User'}: ${column.label}`}
                  checked={(props.draft.levels[person.user_id] ?? 0) === column.level}
                  disabled={!props.canEdit}
                  onChange={() => props.onLevel(person.user_id, column.level)}
                />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function Minimums(props: { draft: GridDraft; canEdit: boolean; onMin: (level: number, value: number) => void }): ReactNode {
  return (
    <div className="flex flex-wrap gap-4">
      {GRID_LEVELS.map((level) => (
        <label key={level} className="flex items-center gap-2 text-sm">
          <span>
            Level {level} — minimum approvals ({countAt(props.draft, level)} approvers)
          </span>
          <Input
            type="number"
            min={1}
            max={10}
            className="w-20"
            aria-label={`Level ${level} minimum approvals`}
            value={props.draft.minimums[level] ?? 1}
            disabled={!props.canEdit}
            onChange={(event) => props.onMin(level, Number(event.target.value))}
          />
        </label>
      ))}
    </div>
  );
}

/**
 * The approver grid (SB-11): who approves a request type, by name and
 * level, with the minimum approvals each level needs. One Save Changes.
 */
export function ApproverGridEditor({ type, peopleHeader, canEdit }: ApproverGridProps): ReactNode {
  const gridQuery = useApproverGrid(type);
  const save = useSaveApproverGrid(type);
  const { addToast } = useToast();
  const [draft, setDraft] = useState<GridDraft | null>(null);

  useEffect(() => {
    if (gridQuery.data) setDraft(draftFrom(gridQuery.data));
  }, [gridQuery.data]);

  if (gridQuery.isLoading) return <Skeleton className="h-32 w-full" />;
  if (gridQuery.isError) return <p className="text-sm text-destructive">Could not load the approvers.</p>;
  if (gridQuery.data === null) return <p className="text-sm text-muted-foreground">Approver levels are not available yet.</p>;
  if (!gridQuery.data || !draft) return null;
  if (gridQuery.data.people.length === 0) {
    return <p className="text-sm text-muted-foreground">Add committee or office users in Units & Users first.</p>;
  }

  const error = draftError(draft);
  const onSave = () =>
    save.mutate(saveBody(draft), {
      onSuccess: () => addToast({ title: 'Approvers saved', variant: 'success' }),
      onError: (failure) =>
        addToast({ title: 'Could not save the approvers', description: friendlyError(failure), variant: 'destructive' }),
    });

  return (
    <div className="space-y-4">
      <PeopleTable
        grid={gridQuery.data}
        draft={draft}
        peopleHeader={peopleHeader}
        canEdit={canEdit}
        onLevel={(userId, level) => setDraft({ ...draft, levels: { ...draft.levels, [userId]: level } })}
      />
      <Minimums draft={draft} canEdit={canEdit} onMin={(level, value) => setDraft({ ...draft, minimums: { ...draft.minimums, [level]: value } })} />
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {canEdit && (
        <Button type="button" onClick={onSave} disabled={Boolean(error) || save.isPending}>
          {save.isPending ? 'Saving…' : 'Save Changes'}
        </Button>
      )}
    </div>
  );
}
