'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { SocietyFields } from '@/components/society-fields';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { useFieldDefs, useSaveFieldDefs, type FieldDef, type FieldPhase, type SaveFieldDefsInput } from '@/hooks/use-resident-fields';
import { friendlyError } from '@/lib/api-error';
import { currentRole } from '@/lib/current-role';
import { NOT_AVAILABLE } from '../shared/move-in-cells';
import { FieldsGrid } from './fields-grid';

// PUT /tenant-lifecycle/fields/:phase is the community admin's (MOVE-S4).
const SAVE_ROLES = new Set(['super_admin', 'community_admin']);
const HEADING: Record<FieldPhase, string> = { in: 'Customize Move-in Fields by Admin', out: 'Customize Move-Out Fields by Admin' };

/** The saved, enabled fields an owner or a tenant would see, as the resident's form shows them. */
export function previewFields(defs: readonly FieldDef[], applies: 'owner' | 'tenant'): FieldDef[] {
  return defs
    .filter((def) => def.is_enabled && (def.applies_to === 'both' || def.applies_to === applies))
    .sort((a, b) => a.position - b.position);
}

function PreviewDialog({ defs, open, onClose }: { defs: readonly FieldDef[]; open: boolean; onClose: () => void }): ReactNode {
  const [applies, setApplies] = useState<'owner' | 'tenant'>('owner');
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Preview form</DialogTitle>
          <DialogDescription>The saved fields, as {applies === 'owner' ? 'an owner' : 'a tenant'} sees them.</DialogDescription>
        </DialogHeader>
        <div className="flex gap-4 py-2 text-sm">
          {(['owner', 'tenant'] as const).map((value) => (
            <label key={value} className="flex items-center gap-1">
              <input type="radio" name="preview-applies" checked={applies === value} onChange={() => setApplies(value)} />
              {value === 'owner' ? 'Owner' : 'Tenant'}
            </label>
          ))}
        </div>
        <SocietyFields fields={previewFields(defs, applies)} values={{}} readOnly />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Move In/Out Tracker › Setup › Custom Fields For Move-in / Move-out
 * (MOVE-14, screens MOVE-S4 / S5): the catalogue rows and the spares, each
 * switched on, ordered and given to owners, tenants or both; one Save
 * Changes. Preview Form shows the saved form.
 */
export function FieldsSetup({ phase }: { phase: FieldPhase }): ReactNode {
  const query = useFieldDefs(phase);
  const save = useSaveFieldDefs(phase);
  const { addToast } = useToast();
  const role = useMemo(() => currentRole(), []);
  const [previewing, setPreviewing] = useState(false);
  const canEdit = role !== null && SAVE_ROLES.has(role);

  async function saveRows(rows: SaveFieldDefsInput['rows']): Promise<void> {
    try {
      await save.mutateAsync({ rows });
      addToast({ title: 'Fields saved', variant: 'success' });
    } catch (error) {
      addToast({ title: 'Could not save the fields', description: friendlyError(error), variant: 'destructive' });
      throw error;
    }
  }

  if (query.isLoading) return <Skeleton className="h-48 w-full" />;
  if (query.data === null) return <p className="text-sm text-muted-foreground">{NOT_AVAILABLE}</p>;
  if (query.isError || !query.data) return <p className="text-sm text-destructive">Could not load the fields.</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold">{HEADING[phase]}</h2>
        <Button type="button" variant="outline" onClick={() => setPreviewing(true)}>
          Preview Form
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">Save changes before previewing the form.</p>
      <FieldsGrid key={query.dataUpdatedAt} label={HEADING[phase]} defs={query.data} readOnly={!canEdit} isSaving={save.isPending} save={saveRows} />
      <PreviewDialog defs={query.data} open={previewing} onClose={() => setPreviewing(false)} />
    </div>
  );
}
