'use client';

import { type ReactNode } from 'react';
import {
  EditableGrid,
  rowErrorsFromApi,
  type GridChange,
  type GridColumn,
  type GridRowState,
  type GridSaveResult,
} from '@/components/editable-grid';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import {
  useAmenityAddonSettings,
  useSaveAmenityAddons,
  type AmenityAddon,
  type AmenityAddonRowInput,
} from '@/hooks/use-amenity-setup';
import { ApiError, friendlyError } from '@/lib/api-error';

/**
 * AMEN-42 — Add / Edit Amenity › Add-ons of a paid amenity: name, the most
 * units a booking may take and the cost per unit. Each add-on a booking
 * takes is a line of its invoice. Saved as one grid; retired, never deleted.
 */

export interface AddonValues {
  name: string;
  maxUnits: string;
  unitCost: string;
}

const blank = (): AddonValues => ({ name: '', maxUnits: '', unitCost: '' });
const isBlank = (values: AddonValues): boolean => !values.name.trim() && !values.maxUnits && !values.unitCost;

export function savedAddonRows(addons: readonly AmenityAddon[]) {
  return addons.map((addon) => ({
    id: addon.id,
    inactive: !addon.is_active,
    values: { name: addon.name, maxUnits: String(addon.max_units), unitCost: addon.unit_cost },
  }));
}

export function validateAddons(rows: readonly GridRowState<AddonValues>[]): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const row of rows) {
    if (!row.id && isBlank(row.values)) continue;
    const name = row.values.name.trim();
    const units = Number(row.values.maxUnits);
    const cost = Number(row.values.unitCost);
    if (name.length < 2 || name.length > 60) errors[row.key] = 'An add-on name is 2 to 60 characters.';
    else if (!Number.isInteger(units) || units < 1 || units > 99) errors[row.key] = 'Maximum units is 1 to 99.';
    else if (row.values.unitCost.trim() === '' || !(cost >= 0)) errors[row.key] = 'The cost per unit is 0 or more.';
  }
  return errors;
}

export function toAddonRows(change: GridChange<AddonValues>): AmenityAddonRowInput[] {
  return change.rows.map((row) => ({
    ...(row.id ? { id: row.id } : {}),
    name: row.values.name.trim(),
    max_units: Number(row.values.maxUnits),
    unit_cost: Number(row.values.unitCost),
    is_active: !row.inactive,
  }));
}

const COLUMNS: GridColumn<AddonValues>[] = [
  { key: 'name', header: 'Add-on', kind: 'text', field: 'name', maxLength: 60, placeholder: 'e.g. Chairs pack' },
  { key: 'max', header: 'Maximum Units', kind: 'number', field: 'maxUnits', min: 1, max: 99, step: 1 },
  { key: 'cost', header: 'Cost per Unit', kind: 'number', field: 'unitCost', min: 0, step: 0.01 },
];

export function AddonGrid({ amenityId }: { amenityId: string }): ReactNode {
  const { addToast } = useToast();
  const addonsQuery = useAmenityAddonSettings(amenityId);
  const save = useSaveAmenityAddons(amenityId);

  if (addonsQuery.isLoading) return <Skeleton className="h-24 w-full" />;
  if (addonsQuery.error || !addonsQuery.data) {
    const notYet = addonsQuery.error instanceof ApiError && addonsQuery.error.status === 404;
    return <p className="text-sm text-muted-foreground">{notYet ? 'Add-ons are not available yet on this server.' : 'The add-ons could not be loaded.'}</p>;
  }
  const addons = addonsQuery.data;

  async function onSave(change: GridChange<AddonValues>): Promise<GridSaveResult | void> {
    try {
      await save.mutateAsync(toAddonRows(change));
      addToast({ title: 'Add-ons saved', variant: 'success' });
    } catch (error) {
      addToast({ title: 'Could not save the add-ons', description: friendlyError(error), variant: 'destructive' });
      return { rowErrors: rowErrorsFromApi(error, change) };
    }
  }

  return (
    <EditableGrid
      key={addons.map((addon) => `${addon.id}:${addon.is_active}`).join(',')}
      label="Add-ons"
      columns={COLUMNS}
      rows={savedAddonRows(addons)}
      blank={blank}
      isBlank={isBlank}
      validate={validateAddons}
      spareRows={3}
      reorder
      deactivate={{ header: 'Retire', label: 'Retire' }}
      isSaving={save.isPending}
      emptyText="No add-ons yet"
      onSave={onSave}
    />
  );
}
