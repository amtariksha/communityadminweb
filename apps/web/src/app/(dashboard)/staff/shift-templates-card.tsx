'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { Clock, Pencil, Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { friendlyError } from '@/lib/api-error';
import { useCreateShift, useDeleteShift, useStaffShifts, useUpdateShift } from '@/hooks/use-staff';
import type { Shift } from '@/hooks/use-staff';

interface ShiftValues {
  name: string;
  start: string;
  end: string;
}

const EMPTY: ShiftValues = { name: '', start: '', end: '' };

// staff_shifts.start_time / end_time come back as "HH:MM:SS"; the form and
// the API take "HH:MM".
const hhmm = (time: string): string => time.slice(0, 5);

interface ShiftDialogProps {
  open: boolean;
  editing: boolean;
  values: ShiftValues;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (values: ShiftValues) => void;
  onSubmit: (event: FormEvent) => void;
  onAdd: () => void;
}

function ShiftDialog({ open, editing, values, saving, onOpenChange, onChange, onSubmit, onAdd }: ShiftDialogProps): ReactNode {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger>
        <Button size="sm" onClick={onAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Create Shift
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Shift' : 'Create Shift'}</DialogTitle>
            <DialogDescription>{editing ? 'Change the shift name or times' : 'Define a new shift template'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="shift-name">Shift Name</Label>
              <Input id="shift-name" required placeholder="e.g., Morning Shift" value={values.name} onChange={(e) => onChange({ ...values, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
              <div className="space-y-2">
                <Label htmlFor="shift-start">Start Time</Label>
                <Input id="shift-start" type="time" required value={values.start} onChange={(e) => onChange({ ...values, start: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shift-end">End Time</Label>
                <Input id="shift-end" type="time" required value={values.end} onChange={(e) => onChange({ ...values, end: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : editing ? 'Save' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ShiftRow({ shift, onEdit, onDelete }: { shift: Shift; onEdit: () => void; onDelete: () => void }): ReactNode {
  return (
    <div className="flex items-center justify-between rounded-md border p-4" data-testid={`shift-${shift.id}`}>
      <div className="flex items-center gap-3">
        <Clock className="h-5 w-5 text-muted-foreground" />
        <div>
          <p className="font-medium">{shift.name}</p>
          <p className="text-xs text-muted-foreground">
            {hhmm(shift.start_time)} - {hhmm(shift.end_time)}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" aria-label={`Edit ${shift.name}`} onClick={onEdit}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" aria-label={`Delete ${shift.name}`} onClick={onDelete}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}

function useShiftActions(onSaved: () => void) {
  const { addToast } = useToast();
  const createShift = useCreateShift();
  const updateShift = useUpdateShift();
  const deleteShift = useDeleteShift();

  function report(title: string, failure: string, after?: () => void) {
    return {
      onSuccess: () => { after?.(); addToast({ title, variant: 'success' as const }); },
      onError: (error: unknown) => addToast({ title: failure, description: friendlyError(error), variant: 'destructive' as const }),
    };
  }

  return {
    saving: createShift.isPending || updateShift.isPending,
    save(editingId: string, values: ShiftValues): void {
      const data = { name: values.name, start_time: values.start, end_time: values.end };
      if (editingId) updateShift.mutate({ id: editingId, data }, report('Shift updated', 'Failed to update shift', onSaved));
      else createShift.mutate(data, report('Shift created', 'Failed to create shift', onSaved));
    },
    // A shift already used by an assignment or attendance is refused by the API.
    remove(shift: Shift): void {
      if (!window.confirm(`Delete the shift "${shift.name}"?`)) return;
      deleteShift.mutate(shift.id, report('Shift deleted', 'Failed to delete shift'));
    },
  };
}

/** Staff › Shifts & Assignments › Shift Templates: create, edit and delete shifts. */
export function ShiftTemplatesCard(): ReactNode {
  const shiftsQuery = useStaffShifts();
  const shifts: Shift[] = shiftsQuery.data ?? [];
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState('');
  const [values, setValues] = useState<ShiftValues>(EMPTY);
  const actions = useShiftActions(() => setOpen(false));

  function reset(): void {
    setEditingId('');
    setValues(EMPTY);
  }

  function edit(shift: Shift): void {
    setEditingId(shift.id);
    setValues({ name: shift.name, start: hhmm(shift.start_time), end: hhmm(shift.end_time) });
    setOpen(true);
  }

  function submit(event: FormEvent): void {
    event.preventDefault();
    actions.save(editingId, values);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Shift Templates</CardTitle>
          <ShiftDialog
            open={open}
            editing={editingId !== ''}
            values={values}
            saving={actions.saving}
            onOpenChange={(next) => { setOpen(next); if (!next) reset(); }}
            onChange={setValues}
            onSubmit={submit}
            onAdd={reset}
          />
        </div>
      </CardHeader>
      <CardContent>
        {shiftsQuery.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : shifts.length > 0 ? (
          <div className="space-y-3">
            {shifts.map((shift) => (
              <ShiftRow key={shift.id} shift={shift} onEdit={() => edit(shift)} onDelete={() => actions.remove(shift)} />
            ))}
          </div>
        ) : (
          <p className="py-8 text-center text-muted-foreground">No shifts defined. Create shift templates to assign staff.</p>
        )}
      </CardContent>
    </Card>
  );
}
