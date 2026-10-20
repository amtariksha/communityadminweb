'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { useChecklistItems, useSaveChecklistItems, type ChecklistPhase, type SaveChecklistInput } from '@/hooks/use-move-checklists';
import { friendlyError } from '@/lib/api-error';
import { currentRole } from '@/lib/current-role';
import { NOT_AVAILABLE } from '../shared/move-in-cells';
import { ChecklistGrid, checklistLabelError } from './checklist-grid';
import { NocEmailSwitch } from './noc-email-switch';

// PUT /tenant-lifecycle/checklists/:phase.
const SAVE_ROLES = new Set(['super_admin', 'community_admin', 'committee_member']);
const PHASE_LABEL: Record<ChecklistPhase, string> = { in: 'Move In', out: 'Move Out' };

function AddEntry(props: { phaseLabel: string; labels: readonly string[]; busy: boolean; onAdd: (label: string) => Promise<boolean> }): ReactNode {
  const [label, setLabel] = useState('');
  const [error, setError] = useState<string | null>(null);
  async function add(): Promise<void> {
    const problem = checklistLabelError(label, props.labels);
    setError(problem);
    if (problem) return;
    if (await props.onAdd(label.trim())) setLabel('');
  }
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          className="max-w-md"
          aria-label={`Add New Entry in ${props.phaseLabel} Check List`}
          maxLength={200}
          value={label}
          onChange={(event) => setLabel(event.target.value)}
        />
        <Button type="button" disabled={props.busy} onClick={() => void add()}>
          Add Entry to {props.phaseLabel} CheckList
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Move In/Out Tracker › Setup › Move In / Move Out CheckList (MOVE-13,
 * screens MOVE-S2 / S3): the add-entry box saves the new item at the end
 * of the list; the grid edits labels, order and Enabled? with one Save
 * Changes. Enabled items appear on each new request of the phase.
 */
export function ChecklistSetup({ phase }: { phase: ChecklistPhase }): ReactNode {
  const query = useChecklistItems(phase);
  const save = useSaveChecklistItems(phase);
  const { addToast } = useToast();
  const role = useMemo(() => currentRole(), []);
  const phaseLabel = PHASE_LABEL[phase];
  const canEdit = role !== null && SAVE_ROLES.has(role);

  async function saveRows(rows: SaveChecklistInput['rows']): Promise<void> {
    try {
      await save.mutateAsync({ rows });
      addToast({ title: 'Checklist saved', variant: 'success' });
    } catch (error) {
      addToast({ title: 'Could not save the checklist', description: friendlyError(error), variant: 'destructive' });
      throw error;
    }
  }

  if (query.isLoading) return <Skeleton className="h-32 w-full" />;
  if (query.data === null) return <p className="text-sm text-muted-foreground">{NOT_AVAILABLE}</p>;
  if (query.isError || !query.data) return <p className="text-sm text-destructive">Could not load the checklist.</p>;
  const items = query.data;

  const add = async (label: string): Promise<boolean> => {
    const rows = [...items.map((item) => ({ id: item.id, label: item.label, is_enabled: item.is_enabled })), { label, is_enabled: true }];
    return saveRows(rows).then(
      () => true,
      () => false,
    );
  };

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold">Customize {phaseLabel === 'Move In' ? 'Move-In' : 'Move-Out'} CheckList</h2>
      {canEdit && <AddEntry phaseLabel={phaseLabel} labels={items.map((item) => item.label)} busy={save.isPending} onAdd={add} />}
      {!canEdit && items.length === 0 && <p className="text-sm text-muted-foreground">No checklist items yet.</p>}
      <ChecklistGrid key={query.dataUpdatedAt} phaseLabel={phaseLabel} items={items} readOnly={!canEdit} isSaving={save.isPending} save={saveRows} />
      {phase === 'out' && <NocEmailSwitch canEdit={role === 'community_admin' || role === 'super_admin'} />}
    </div>
  );
}
