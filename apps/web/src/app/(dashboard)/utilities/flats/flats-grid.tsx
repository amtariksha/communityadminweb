'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type ReactNode } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { EditableGrid, type GridCellProps, type GridChange, type GridColumn, type GridSaveResult, type SavedGridRow } from '@/components/editable-grid';
import { Button, buttonVariants } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { FlatValues } from './flats-state';

export interface FlatsGridProps {
  rows: readonly SavedGridRow<FlatValues>[];
  canWrite: boolean;
  saving: boolean;
  onSave: (change: GridChange<FlatValues>) => Promise<GridSaveResult | void>;
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
        <DropdownMenuItem onClick={() => router.push(`/utilities/flats/meters?unit=${unitId}`)}>Meters</DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push(`/utilities/flats/meters?unit=${unitId}&add=1`)}>Add meter</DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push(`/utilities/income/${unitId}/statement`)}>Utility statement</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function TrackedCell({ cell }: { cell: GridCellProps<FlatValues> }): ReactNode {
  const name = `tracked-${cell.row.key}`;
  return (
    <span className="flex gap-3">
      {(['yes', 'no'] as const).map((value) => (
        <label key={value} className="flex items-center gap-1 text-sm">
          <input
            type="radio"
            name={name}
            aria-label={`${value === 'yes' ? 'Tracked' : 'Not tracked'}, ${cell.row.values.unit}`}
            disabled={cell.disabled}
            checked={cell.row.values.tracked === value}
            onChange={() => cell.change({ tracked: value })}
          />
          {value === 'yes' ? 'Yes' : 'No'}
        </label>
      ))}
    </span>
  );
}

function flatColumns(): GridColumn<FlatValues>[] {
  return [
    { key: 'unit', header: 'Unit', kind: 'custom', render: (cell) => <span className="font-medium">{cell.row.values.unit}</span> },
    { key: 'tracked', header: 'Tracked', kind: 'custom', render: (cell) => <TrackedCell cell={cell} /> },
    { key: 'sqft1', header: 'Sq.ft 1', kind: 'number', field: 'sqft1', min: 0, step: 'any', label: (n) => `Sq.ft 1, row ${n}` },
    { key: 'sqft2', header: 'Sq.ft 2', kind: 'number', field: 'sqft2', min: 0, step: 'any', label: (n) => `Sq.ft 2, row ${n}` },
    {
      key: 'contact',
      header: 'Primary Contact',
      kind: 'custom',
      render: (cell) =>
        cell.row.id ? (
          <Link href={`/units/approved/${cell.row.id}`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            {cell.row.values.contact || 'Primary Contact'}
          </Link>
        ) : null,
    },
    { key: 'more', header: 'More', kind: 'custom', render: (cell) => (cell.row.id ? <MoreMenu unitId={cell.row.id} label={cell.row.values.unit} /> : null) },
  ];
}

/** Track Utility Flats (UTIL-S4): Tracked and the two areas of each unit in place, one Save Changes. */
export function FlatsGrid(props: FlatsGridProps): ReactNode {
  return (
    <EditableGrid<FlatValues>
      label="Utility flats"
      columns={flatColumns()}
      rows={props.rows}
      blank={() => ({ unit: '', contact: '', tracked: 'no', metered: false, sqft1: '', sqft2: '' })}
      spareRows={0}
      readOnly={!props.canWrite}
      isSaving={props.saving}
      emptyText="No units in this block."
      onSave={props.onSave}
    />
  );
}
