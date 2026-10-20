'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/toast';
import type { ApproverGridPerson } from '@/hooks/use-approver-grid';
import { useMoveInFlow, useSaveMoveInFlow } from '@/hooks/use-move-in-setup';
import { friendlyError } from '@/lib/api-error';
import { canChangeSettings } from '../../../settings/settings-access';
import { NOT_AVAILABLE } from '../../shared/move-in-cells';
import { VERIFIER_LEVELS, draftFrom, personLabel, saveBody, verifiersError, type VerifiersDraft } from './verifiers-state';

const COLUMNS = [{ level: 0, label: 'No Access' }, ...VERIFIER_LEVELS.map((level) => ({ level, label: `Level ${level}` }))];

function PeopleGrid(props: {
  people: readonly ApproverGridPerson[];
  draft: VerifiersDraft;
  canEdit: boolean;
  onLevel: (userId: string, level: number) => void;
}): ReactNode {
  return (
    <Table aria-label="Move In Approvers">
      <TableHeader>
        <TableRow>
          <TableHead>Move In Approvers</TableHead>
          {COLUMNS.map((column) => (
            <TableHead key={column.level} className="text-center">
              {column.label}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {props.people.map((person) => (
          <TableRow key={person.user_id}>
            <TableCell className="font-medium">{personLabel(person)}</TableCell>
            {COLUMNS.map((column) => (
              <TableCell key={column.level} className="text-center">
                <input
                  type="radio"
                  name={`move-in-level-${person.user_id}`}
                  aria-label={`${personLabel(person)}: ${column.label}`}
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

/**
 * Move In/Out Tracker › Setup › Verifiers (MOVE-12, screen MOVE-S1): one
 * switch above the approver grid limited to two levels, one Save. With the
 * flow off every move-in waits at today's single society level; with it on,
 * any one person on a level approves it. Only the community admin changes it.
 */
export function VerifiersSetup(): ReactNode {
  const flow = useMoveInFlow();
  const save = useSaveMoveInFlow();
  const { addToast } = useToast();
  const canEdit = canChangeSettings();
  const [draft, setDraft] = useState<VerifiersDraft | null>(null);

  useEffect(() => {
    if (flow.data) setDraft(draftFrom(flow.data));
  }, [flow.data]);

  if (flow.isLoading) return <Skeleton className="h-32 w-full" />;
  if (flow.isError) return <p className="text-sm text-destructive">Could not load the move-in verifiers.</p>;
  if (flow.data === null) return <p className="text-sm text-muted-foreground">{NOT_AVAILABLE}</p>;
  if (!flow.data || !draft) return null;

  const error = verifiersError(draft);
  const onSave = () =>
    save.mutate(saveBody(draft), {
      onSuccess: () => addToast({ title: 'Move-in verifiers saved', variant: 'success' }),
      onError: (failure) => addToast({ title: 'Could not save', description: friendlyError(failure), variant: 'destructive' }),
    });

  return (
    <div className="space-y-4">
      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={draft.flowEnabled}
          disabled={!canEdit}
          onChange={(event) => setDraft({ ...draft, flowEnabled: event.target.checked })}
        />
        Enable move-in flow
      </label>
      {flow.data.grid.people.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No committee or office staff to choose from — add them in Units &amp; Users › Access Control.
        </p>
      ) : (
        <PeopleGrid
          people={flow.data.grid.people}
          draft={draft}
          canEdit={canEdit}
          onLevel={(userId, level) => setDraft({ ...draft, levels: { ...draft.levels, [userId]: level } })}
        />
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {canEdit && (
        <Button type="button" onClick={onSave} disabled={Boolean(error) || save.isPending}>
          {save.isPending ? 'Saving…' : 'Save'}
        </Button>
      )}
    </div>
  );
}
