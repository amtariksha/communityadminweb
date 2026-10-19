'use client';

import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { FormFrame } from '@/components/form-page';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { useUnitBlocks } from '@/hooks/use-unit-blocks';
import { useUnit, useUpdateUnit } from '@/hooks/use-units';
import { friendlyError } from '@/lib/api-error';
import { TRACK_UNITS_BASE } from './track-units-grid';

/** The block choices: the block master's, plus the unit's own if it is not there. */
export function blockChoices(names: readonly string[], current: string | null | undefined): string[] {
  return current && !names.includes(current) ? [current, ...names] : [...names];
}

function RenameFields({ unitId, block, unitNumber }: { unitId: string; block: string; unitNumber: string }): ReactNode {
  const router = useRouter();
  const { addToast } = useToast();
  const blocks = useUnitBlocks();
  const update = useUpdateUnit();
  const [form, setForm] = useState({ block, unitNumber });
  const [error, setError] = useState<string | null>(null);
  const close = (): void => router.push(TRACK_UNITS_BASE);

  function save(): void {
    const unitNumber = form.unitNumber.trim();
    if (!unitNumber || unitNumber.length > 20) {
      setError('The unit takes 1 to 20 characters.');
      return;
    }
    update.mutate(
      { id: unitId, data: { unit_number: unitNumber, block: form.block || null } },
      {
        onSuccess: () => {
          addToast({ title: 'Unit details corrected', variant: 'success' });
          close();
        },
        onError: (failure) => setError(friendlyError(failure)),
      },
    );
  }

  const names = blockChoices((blocks.data?.data ?? []).map((row) => row.name), block);
  return (
    <FormFrame mode="page" title="Correct Unit Details" saveLabel="Change" savingLabel="Changing…" saving={update.isPending} onClose={close} onSave={save}>
      <p className="text-sm text-muted-foreground">Documents already issued keep the number they were issued with.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="rename-block">Block</Label>
          <Select id="rename-block" value={form.block} onChange={(event) => setForm({ ...form, block: event.target.value })}>
            {names.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="rename-unit">Unit</Label>
          <Input id="rename-unit" maxLength={20} value={form.unitNumber} onChange={(event) => setForm({ ...form, unitNumber: event.target.value })} />
        </div>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </FormFrame>
  );
}

/** Track Units › Rename ("Correct Unit Details", INC-S15): block and unit number of one unit. */
export function RenameUnitForm({ unitId }: { unitId: string }): ReactNode {
  const unit = useUnit(unitId);
  if (unit.isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!unit.data) return <p className="text-sm text-destructive">This unit could not be loaded.</p>;
  return <RenameFields unitId={unitId} block={unit.data.block ?? ''} unitNumber={unit.data.unit_number} />;
}
