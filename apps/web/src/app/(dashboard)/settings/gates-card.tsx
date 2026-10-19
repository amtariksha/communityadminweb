'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { MapPin, MoreVertical, Plus, Power } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/toast';
import { friendlyError } from '@/lib/api-error';
import { useCreateGate, useDeleteGate, useGates, useUpdateGate } from '@/hooks/use-staff';
import type { Gate } from '@/hooks/use-staff';
import { gateDirectionLabel } from '@/hooks/use-gate-grid';

// The values the API accepts (`main` is stored as vehicle_and_pedestrian).
const GATE_TYPE_OPTIONS = [
  { value: 'main', label: 'Main' },
  { value: 'service', label: 'Service' },
  { value: 'vehicle_and_pedestrian', label: 'Vehicle & Pedestrian' },
  { value: 'vehicle_only', label: 'Vehicle Only' },
  { value: 'pedestrian_only', label: 'Pedestrian Only' },
] as const;

const GATE_TYPE_LABEL: Record<string, string> = {
  vehicle_and_pedestrian: 'Vehicle & Pedestrian',
  vehicle_only: 'Vehicle Only',
  pedestrian_only: 'Pedestrian Only',
  service: 'Service',
};

interface GateFormValues {
  name: string;
  location: string;
  gateType: string;
  // GATE-20: the gate lets people In, Out or both.
  entry: boolean;
  exit: boolean;
}

const EMPTY_FORM: GateFormValues = { name: '', location: '', gateType: 'main', entry: true, exit: true };
export const NEEDS_DIRECTION = 'Tick In, Out or both.';

interface GateDialogProps {
  open: boolean;
  editing: boolean;
  values: GateFormValues;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (values: GateFormValues) => void;
  onSubmit: (event: FormEvent) => void;
  onAdd: () => void;
}

function GateDialog({ open, editing, values, saving, onOpenChange, onChange, onSubmit, onAdd }: GateDialogProps): ReactNode {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger>
        <Button size="sm" onClick={onAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Add Gate
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Gate' : 'Add Gate'}</DialogTitle>
            <DialogDescription>{editing ? 'Update gate configuration' : 'Add a new gate entry point'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="gate-name">Gate Name</Label>
              <Input
                id="gate-name"
                required
                placeholder="e.g., Main Gate"
                value={values.name}
                onChange={(e) => onChange({ ...values, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gate-location">Location</Label>
              <Input
                id="gate-location"
                placeholder="e.g., North entrance"
                value={values.location}
                onChange={(e) => onChange({ ...values, location: e.target.value })}
              />
            </div>
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Direction</legend>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={values.entry} onChange={(e) => onChange({ ...values, entry: e.target.checked })} />
                  In
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={values.exit} onChange={(e) => onChange({ ...values, exit: e.target.checked })} />
                  Out
                </label>
              </div>
              {!values.entry && !values.exit && (
                <p role="alert" className="text-xs text-destructive">{NEEDS_DIRECTION}</p>
              )}
            </fieldset>
            <div className="space-y-2">
              <Label htmlFor="gate-type">Type</Label>
              <Select id="gate-type" value={values.gateType} onChange={(e) => onChange({ ...values, gateType: e.target.value })}>
                {GATE_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={saving || (!values.entry && !values.exit)}>
              {saving ? 'Saving...' : 'Save Gate'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface GateRowProps {
  gate: Gate;
  onEdit: (gate: Gate) => void;
  onDeactivate: (gate: Gate) => void;
  onReactivate: (gate: Gate) => void;
}

function GateRow({ gate, onEdit, onDeactivate, onReactivate }: GateRowProps): ReactNode {
  return (
    <TableRow data-testid={`gate-row-${gate.id}`} className={gate.is_active ? undefined : 'opacity-60'}>
      <TableCell className="font-medium">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          {gate.name}
        </div>
      </TableCell>
      <TableCell>{gate.location ?? '-'}</TableCell>
      <TableCell>{GATE_TYPE_LABEL[gate.gate_type] ?? gate.gate_type}</TableCell>
      <TableCell>{gateDirectionLabel(gate)}</TableCell>
      <TableCell>{gate.staff_count ?? 0}</TableCell>
      <TableCell>
        <Badge variant={gate.is_active ? 'success' : 'secondary'}>{gate.is_active ? 'Active' : 'Inactive'}</Badge>
      </TableCell>
      <TableCell>
        {gate.is_active ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label={`Actions for ${gate.name}`}>
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(gate)}>Edit</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={() => onDeactivate(gate)}>
                <Power className="mr-2 h-4 w-4" />
                Deactivate
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button variant="outline" size="sm" onClick={() => onReactivate(gate)}>
            Reactivate
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}

function useGateActions(onSaved: () => void) {
  const { addToast } = useToast();
  const createGate = useCreateGate();
  const updateGate = useUpdateGate();
  const deleteGate = useDeleteGate();

  function report(title: string) {
    return {
      onSuccess: () => addToast({ title, variant: 'success' as const }),
      onError: (error: unknown) =>
        addToast({ title: 'Could not save the gate', description: friendlyError(error), variant: 'destructive' as const }),
    };
  }

  function save(editingId: string, values: GateFormValues): void {
    const data = {
      name: values.name,
      location: values.location || undefined,
      gate_type: values.gateType,
      allows_entry: values.entry,
      allows_exit: values.exit,
    };
    const after = report(editingId ? 'Gate updated' : 'Gate created');
    const options = { ...after, onSuccess: () => { onSaved(); after.onSuccess(); } };
    if (editingId) updateGate.mutate({ id: editingId, data }, options);
    else createGate.mutate(data, options);
  }

  return {
    saving: createGate.isPending || updateGate.isPending,
    save,
    // DELETE /gate/gates/:id retires the gate; nothing is deleted.
    deactivate: (gate: Gate) => deleteGate.mutate(gate.id, report('Gate deactivated')),
    reactivate: (gate: Gate) => updateGate.mutate({ id: gate.id, data: { is_active: true } }, report('Gate reactivated')),
  };
}

/** Settings › Gates Configuration: add, edit, deactivate and reactivate gates. */
export function GatesCard({ children }: { children?: ReactNode }): ReactNode {
  const gatesQuery = useGates({ includeInactive: true });
  const gates: Gate[] = gatesQuery.data ?? [];
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState('');
  const [values, setValues] = useState<GateFormValues>(EMPTY_FORM);
  const actions = useGateActions(() => setDialogOpen(false));

  function reset(): void {
    setEditingId('');
    setValues(EMPTY_FORM);
  }

  function openEdit(gate: Gate): void {
    setEditingId(gate.id);
    setValues({
      name: gate.name,
      location: gate.location ?? '',
      gateType: gate.gate_type,
      // An older API sends neither flag: every gate is In and Out there.
      entry: gate.allows_entry !== false,
      exit: gate.allows_exit !== false,
    });
    setDialogOpen(true);
  }

  function submit(event: FormEvent): void {
    event.preventDefault();
    if (!values.entry && !values.exit) return;
    actions.save(editingId, values);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Gates Configuration</CardTitle>
          <GateDialog
            open={dialogOpen}
            editing={editingId !== ''}
            values={values}
            saving={actions.saving}
            onOpenChange={(open) => { setDialogOpen(open); if (!open) reset(); }}
            onChange={setValues}
            onSubmit={submit}
            onAdd={reset}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {gatesQuery.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : gates.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>In / Out</TableHead>
                <TableHead>Staff Count</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-28">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gates.map((gate) => (
                <GateRow
                  key={gate.id}
                  gate={gate}
                  onEdit={openEdit}
                  onDeactivate={actions.deactivate}
                  onReactivate={actions.reactivate}
                />
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="py-8 text-center text-muted-foreground">No gates configured. Add gates to manage entry points.</p>
        )}
        {children}
      </CardContent>
    </Card>
  );
}
