'use client';

import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { friendlyError } from '@/lib/api-error';
import { currentRole } from '@/lib/current-role';
import {
  PARKING_LABEL_MAX,
  useParkingSettings,
  useSaveParkingSettings,
  type ParkingSettings,
} from '@/hooks/use-parking-settings';

// Matches PATCH /tenant-settings/parking.
const WRITE_ROLES = new Set(['super_admin', 'community_admin', 'committee_member']);

function Switch({ id, label, hint, checked, disabled, onChange }: {
  id: string;
  label: string;
  hint: string;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}): ReactNode {
  return (
    <div className="flex items-start gap-3">
      <input id={id} type="checkbox" className="mt-1 h-4 w-4" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />
      <div>
        <Label htmlFor={id}>{label}</Label>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
    </div>
  );
}

function SetupFields({ saved }: { saved: ParkingSettings }): ReactNode {
  const { addToast } = useToast();
  const save = useSaveParkingSettings();
  const editable = useMemo(() => WRITE_ROLES.has(currentRole() ?? ''), []);
  const [values, setValues] = useState<ParkingSettings>(saved);
  const set = (changes: Partial<ParkingSettings>) => setValues((current) => ({ ...current, ...changes }));
  const tooLong = values.vehicle_additional_field_label.trim().length > PARKING_LABEL_MAX;

  function submit(event: FormEvent): void {
    event.preventDefault();
    if (tooLong) return;
    save.mutate(
      { ...values, vehicle_additional_field_label: values.vehicle_additional_field_label.trim() },
      {
        onSuccess: () => addToast({ title: 'Parking Setup saved', variant: 'success' }),
        onError: (error) => addToast({ title: 'Could not save Parking Setup', description: friendlyError(error), variant: 'destructive' }),
      },
    );
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Slot Settings</h3>
        <p className="text-sm text-muted-foreground">Slots are added and assigned by the committee under Slots.</p>
        <div className="max-w-sm space-y-2">
          <Label htmlFor="parking-additional-label">Additional Field label</Label>
          <Input
            id="parking-additional-label"
            placeholder="e.g. Fastag"
            value={values.vehicle_additional_field_label}
            disabled={!editable}
            onChange={(event) => set({ vehicle_additional_field_label: event.target.value })}
          />
          <p className={tooLong ? 'text-xs text-destructive' : 'text-xs text-muted-foreground'}>
            {tooLong ? `At most ${PARKING_LABEL_MAX} characters.` : 'Names an extra column on the vehicle register. Leave blank to hide it.'}
          </p>
        </div>
      </section>
      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Vehicle Slot Assignment Settings</h3>
        <Switch
          id="parking-residents-add"
          label="Allow residents to add vehicles"
          hint="From the resident app and web. A resident's new vehicle still waits for approval."
          checked={values.residents_can_add_vehicle}
          disabled={!editable}
          onChange={(checked) => set({ residents_can_add_vehicle: checked })}
        />
        <Switch
          id="parking-residents-edit"
          label="Allow residents to edit their vehicles"
          hint="Change or remove the vehicles of their own unit. The committee can always do both."
          checked={values.residents_can_edit_vehicle}
          disabled={!editable}
          onChange={(checked) => set({ residents_can_edit_vehicle: checked })}
        />
      </section>
      {editable && (
        <Button type="submit" disabled={save.isPending || tooLong}>
          <Save className="mr-2 h-4 w-4" />
          {save.isPending ? 'Saving…' : 'Save'}
        </Button>
      )}
    </form>
  );
}

/**
 * Parking Setup (PARK-10, screen PARK-S1): whether residents may add and
 * edit their vehicles, and the name of the register's extra field (PARK-08).
 * The classic Setup page and the standard Settings › Parking card.
 */
export function ParkingSetupForm(): ReactNode {
  const query = useParkingSettings();
  if (query.isLoading) return <Skeleton className="h-40 w-full" />;
  if (query.isError) {
    return <p role="alert" className="text-sm text-destructive">Parking Setup could not be loaded. Reload the page to try again.</p>;
  }
  if (!query.data) return <p className="text-sm text-muted-foreground">Parking Setup is not available yet.</p>;
  return <SetupFields key={query.dataUpdatedAt} saved={query.data} />;
}
