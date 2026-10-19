'use client';

import { useState, type ReactNode } from 'react';
import { FormFrame } from '@/components/form-page';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toast';
import { useCreateUnit } from '@/hooks/use-units';
import { friendlyError } from '@/lib/api-error';

export interface NewUnitForm {
  unitNumber: string;
  block: string;
  floor: string;
  area: string;
}

const EMPTY: NewUnitForm = { unitNumber: '', block: '', floor: '', area: '' };

/**
 * The create-unit request of today's Add Unit form (/units), with its rules:
 * a block is required (the guard app groups units by it), the floor is a
 * whole number from -5 to 200 and Sq.ft 1 above 0.
 */
export function newUnitInput(form: NewUnitForm):
  | { ok: true; input: { unit_number: string; block: string; floor: number; area_sqft: number; unit_type: string } }
  | { ok: false; error: string } {
  const unitNumber = form.unitNumber.trim();
  const block = form.block.trim().toUpperCase();
  const floor = Number(form.floor);
  const area = Number(form.area);
  if (!unitNumber) return { ok: false, error: 'Enter the unit number.' };
  if (!block) return { ok: false, error: 'Enter the block this unit belongs to (e.g. A, B, Tower1).' };
  if (form.floor.trim() === '' || !Number.isInteger(floor) || floor < -5 || floor > 200) {
    return { ok: false, error: 'Floor must be a whole number between -5 and 200.' };
  }
  if (!Number.isFinite(area) || area <= 0) return { ok: false, error: 'Sq.ft 1 must be more than 0.' };
  return { ok: true, input: { unit_number: unitNumber, block, floor, area_sqft: area, unit_type: 'residential' } };
}

/** Track Units › Add Missing Unit (INC-49): the society's create-unit form. */
export function AddUnitDialog({ open, defaultBlock, onClose }: { open: boolean; defaultBlock: string | null; onClose: () => void }): ReactNode {
  const { addToast } = useToast();
  const createUnit = useCreateUnit();
  const [form, setForm] = useState<NewUnitForm>({ ...EMPTY, block: defaultBlock ?? '' });
  const [error, setError] = useState<string | null>(null);
  const set = (key: keyof NewUnitForm, value: string): void => setForm((current) => ({ ...current, [key]: value }));

  function save(): void {
    const checked = newUnitInput(form);
    if (!checked.ok) {
      setError(checked.error);
      return;
    }
    setError(null);
    createUnit.mutate(checked.input, {
      onSuccess: () => {
        addToast({ title: `Unit ${checked.input.block}-${checked.input.unit_number} added`, variant: 'success' });
        setForm({ ...EMPTY, block: form.block });
        onClose();
      },
      onError: (failure) => setError(friendlyError(failure)),
    });
  }

  const field = (key: keyof NewUnitForm, label: string, extra: { inputMode?: 'numeric' | 'decimal'; maxLength?: number } = {}) => (
    <div className="space-y-1">
      <Label htmlFor={`add-unit-${key}`}>{label}</Label>
      <Input id={`add-unit-${key}`} value={form[key]} onChange={(event) => set(key, event.target.value)} {...extra} />
    </div>
  );

  return (
    <FormFrame mode="dialog" open={open} title="Add Missing Unit" saveLabel="Add Unit" saving={createUnit.isPending} onClose={onClose} onSave={save}>
      <div className="grid gap-3 sm:grid-cols-2">
        {field('block', 'Block', { maxLength: 50 })}
        {field('unitNumber', 'Unit', { maxLength: 20 })}
        {field('floor', 'Floor', { inputMode: 'numeric' })}
        {field('area', 'Sq.ft 1', { inputMode: 'decimal' })}
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </FormFrame>
  );
}
