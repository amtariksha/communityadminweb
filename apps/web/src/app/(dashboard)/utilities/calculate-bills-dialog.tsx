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
import { useCalculateBills } from '@/hooks';
import { friendlyError } from '@/lib/api-error';
import { calculateBillsSummary } from './calculate-summary';
import { METER_TYPES, meterTypeLabel, type MeterType } from './utility-ui';

interface CalculateBillsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Bills from meter readings for one meter type and period; the toast names skipped meters. */
export function CalculateBillsDialog({ open, onOpenChange }: CalculateBillsDialogProps): ReactNode {
  const { addToast } = useToast();
  const [meterType, setMeterType] = useState<MeterType>('water');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const calcMutation = useCalculateBills();

  function handleCalculate(): void {
    if (!from || !to) {
      addToast({ title: 'Period dates are required', variant: 'destructive' });
      return;
    }
    calcMutation.mutate(
      { meter_type: meterType, period_from: from, period_to: to },
      {
        onSuccess(res) {
          const summary = calculateBillsSummary(res.data);
          addToast({ ...summary, variant: summary.description ? 'default' : 'success' });
          onOpenChange(false);
        },
        onError(error) {
          addToast({ title: 'Failed to calculate bills', description: friendlyError(error), variant: 'destructive' });
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Calculate Bills</DialogTitle>
          <DialogDescription>Generate utility bills from meter readings for a period</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="calc-type">Meter Type</Label>
            <Select id="calc-type" value={meterType} onChange={(e) => setMeterType(e.target.value as MeterType)}>
              {METER_TYPES.map((t) => (
                <option key={t} value={t}>{meterTypeLabel(t)}</option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="calc-from">Period From</Label>
              <Input id="calc-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="calc-to">Period To</Label>
              <Input id="calc-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose><Button variant="outline">Cancel</Button></DialogClose>
          <Button disabled={calcMutation.isPending} onClick={handleCalculate}>
            {calcMutation.isPending ? 'Calculating...' : 'Calculate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
