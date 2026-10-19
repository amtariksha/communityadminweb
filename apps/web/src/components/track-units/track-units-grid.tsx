'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type ReactNode } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { EditableGrid, type GridChange, type GridColumn, type GridSaveResult, type SavedGridRow } from '@/components/editable-grid';
import { Button, buttonVariants } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { UnitBillingCategory } from '@/hooks/use-unit-billing-categories';
import type { TrackUnitValues } from './track-units-state';

export const TRACK_UNITS_BASE = '/income/units';

export interface TrackUnitsGridProps {
  rows: readonly SavedGridRow<TrackUnitValues>[];
  types: readonly UnitBillingCategory[];
  canWrite: boolean;
  canDelete: boolean;
  saving: boolean;
  onSave: (change: GridChange<TrackUnitValues>) => Promise<GridSaveResult | void>;
  onDelete: (unitId: string, label: string) => void;
}

function MoreMenu({ unitId, label }: { unitId: string; label: string }): ReactNode {
  const router = useRouter();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="sm" aria-label={`More for ${label}`}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => router.push(`/units?unit=${unitId}`)}>Edit unit</DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push(`/units/approved/${unitId}`)}>Members</DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push('/utilities')}>Meters</DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push(`/income/members/${unitId}/statement`)}>Account statement</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function typeColumns(types: readonly UnitBillingCategory[]): GridColumn<TrackUnitValues>[] {
  return types.map((type) => ({
    key: `type-${type.id}`,
    header: type.name,
    kind: 'custom' as const,
    render: (cell) => (
      <input
        type="radio"
        name={`unit-type-${cell.row.key}`}
        aria-label={`${type.name}, ${cell.row.values.unit}`}
        disabled={cell.disabled}
        checked={cell.row.values.category === type.id}
        onChange={() => cell.change({ category: type.id })}
      />
    ),
  }));
}

function trackColumns(props: TrackUnitsGridProps): GridColumn<TrackUnitValues>[] {
  const link = buttonVariants({ variant: 'outline', size: 'sm' });
  return [
    { key: 'unit', header: 'Unit', kind: 'custom', render: (cell) => <span className="font-medium">{cell.row.values.unit}</span> },
    ...typeColumns(props.types),
    { key: 'sqft1', header: 'Sq.ft 1', kind: 'number', field: 'sqft1', min: 0, step: 'any', label: (n) => `Sq.ft 1, row ${n}` },
    { key: 'sqft2', header: 'Sq.ft 2', kind: 'number', field: 'sqft2', min: 0, step: 'any', label: (n) => `Sq.ft 2, row ${n}` },
    {
      key: 'contact',
      header: 'Primary Contact',
      kind: 'custom',
      render: (cell) =>
        cell.row.id ? (
          <Link href={`/units/approved/${cell.row.id}`} className="text-primary hover:underline">
            {cell.row.values.contact || 'Add'}
          </Link>
        ) : null,
    },
    {
      key: 'rename',
      header: 'Rename',
      kind: 'custom',
      render: (cell) =>
        cell.row.id && props.canWrite ? (
          <Link href={`${TRACK_UNITS_BASE}/${cell.row.id}/rename`} className={link}>
            Rename
          </Link>
        ) : null,
    },
    {
      key: 'delete',
      header: 'Delete',
      kind: 'custom',
      render: (cell) =>
        cell.row.id && props.canDelete && cell.row.values.deletable ? (
          <Button type="button" variant="outline" size="sm" onClick={() => props.onDelete(cell.row.id as string, cell.row.values.unit)}>
            Delete
          </Button>
        ) : null,
    },
    { key: 'more', header: 'More', kind: 'custom', render: (cell) => (cell.row.id ? <MoreMenu unitId={cell.row.id} label={cell.row.values.unit} /> : null) },
  ];
}

/** Track Units › Unit (INC-S13): type, Sq.ft 1 and Sq.ft 2 of each unit in place, one Save Changes. */
export function TrackUnitsGrid(props: TrackUnitsGridProps): ReactNode {
  return (
    <EditableGrid<TrackUnitValues>
      label="Units"
      columns={trackColumns(props)}
      rows={props.rows}
      blank={() => ({ unit: '', contact: '', deletable: false, category: '', sqft1: '', sqft2: '' })}
      spareRows={0}
      readOnly={!props.canWrite}
      isSaving={props.saving}
      emptyText="No units in this block."
      onSave={props.onSave}
    />
  );
}
