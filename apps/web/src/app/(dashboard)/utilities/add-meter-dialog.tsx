'use client';

import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { UnitSearchSelect } from '@/components/ui/unit-search-select';
import { useCreateMeter, useUnits } from '@/hooks';
import { friendlyError } from '@/lib/api-error';
import { METER_TYPES, meterTypeLabel, type MeterType } from './utility-ui';

interface AddMeterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function GasPlansNote(): ReactNode {
  return (
    <p className="rounded-md border border-dashed p-2 text-xs text-muted-foreground">
      For gas pricing plans &amp; wallet recharges, use the{' '}
      <a href="/gas" className="font-medium text-primary underline-offset-2 hover:underline">
        Gas Management
      </a>{' '}
      page. Utility slabs here are used as fallback when no matching plan is configured.
    </p>
  );
}

function CommonMeterToggle({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }): ReactNode {
  return (
    <div className="flex items-center gap-3 rounded-md border p-3">
      <input
        type="checkbox"
        id="meter-is-common"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="rounded border-input"
      />
      <div>
        <Label htmlFor="meter-is-common" className="mb-0 cursor-pointer">
          Common society meter
        </Label>
        <p className="text-xs text-muted-foreground">
          Shared meter (borewell pump, common lighting, gas manifold) — not tied to a unit.
        </p>
      </div>
    </div>
  );
}

/** Register a meter for a unit, or a common society meter (unit_id NULL, is_common). */
export function AddMeterDialog({ open, onOpenChange }: AddMeterDialogProps): ReactNode {
  const { addToast } = useToast();
  const [unitId, setUnitId] = useState('');
  const [meterType, setMeterType] = useState<MeterType>('water');
  const [meterNumber, setMeterNumber] = useState('');
  const [isCommon, setIsCommon] = useState(false);
  const units = useUnits().data?.data ?? [];
  const createMutation = useCreateMeter();

  function handleCreate(): void {
    if (!meterNumber.trim()) {
      addToast({ title: 'Meter number is required', variant: 'destructive' });
      return;
    }
    if (!isCommon && !unitId) {
      addToast({ title: 'Select a unit or mark the meter as a common society meter', variant: 'destructive' });
      return;
    }
    createMutation.mutate(
      { unit_id: isCommon ? null : unitId, is_common: isCommon, meter_type: meterType, meter_number: meterNumber.trim() },
      {
        onSuccess() {
          addToast({ title: 'Meter created', variant: 'success' });
          onOpenChange(false);
          setUnitId('');
          setMeterNumber('');
          setIsCommon(false);
        },
        onError(error) {
          addToast({ title: 'Failed to create meter', description: friendlyError(error), variant: 'destructive' });
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Meter</DialogTitle>
          <DialogDescription>Register a new utility meter for a unit</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <CommonMeterToggle
            checked={isCommon}
            onChange={(checked) => {
              setIsCommon(checked);
              if (checked) setUnitId('');
            }}
          />
          {!isCommon && (
            <div className="space-y-2">
              <Label htmlFor="meter-unit">Unit</Label>
              <UnitSearchSelect value={unitId} onChange={setUnitId} units={units} placeholder="Search unit..." />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="meter-type">Meter Type</Label>
            <Select id="meter-type" value={meterType} onChange={(e) => setMeterType(e.target.value as MeterType)}>
              {METER_TYPES.map((t) => (
                <option key={t} value={t}>{meterTypeLabel(t)}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="meter-number">Meter Number</Label>
            <Input id="meter-number" placeholder="e.g. WM-101" value={meterNumber} onChange={(e) => setMeterNumber(e.target.value)} />
          </div>
          {meterType === 'gas' && <GasPlansNote />}
        </div>
        <DialogFooter>
          <DialogClose><Button variant="outline">Cancel</Button></DialogClose>
          <Button disabled={createMutation.isPending} onClick={handleCreate}>
            {createMutation.isPending ? 'Creating...' : 'Add Meter'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
