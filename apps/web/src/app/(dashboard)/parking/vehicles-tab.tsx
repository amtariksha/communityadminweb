'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ExportStrip } from '@/components/data-table/export-strip';
import { printableTable, toTsv } from '@/components/data-table/table-text';
import { useToast } from '@/components/ui/toast';
import { friendlyError } from '@/lib/api-error';
import { useBlocks } from '@/hooks';
import { useRemoveVehicle, useVehiclePage, vehicleFiltersToParams } from '@/hooks/use-parking';
import type { Vehicle, VehicleFilters, VehicleRegisterStatus } from '@/hooks/use-parking';
import { useAdditionalFieldLabel } from '@/hooks/use-parking-settings';
import { VehicleForm } from './components/vehicle-form';
import { dayLabel } from './classic/vehicles-register';
import {
  ListPager,
  PARKING_PAGE_SIZE,
  VEHICLE_TEXT_COLUMNS,
  VEHICLE_TYPES,
  slotTypeIcon,
  typeLabel,
  vehicleStatus,
} from './parking-ui';

// Without the Additional Field column, which shows when Parking Setup names it.
const BASE_COLUMN_COUNT = 13;

// The register's own list; "In use and awaiting approval" is the API default.
const STATUS_OPTIONS: ReadonlyArray<{ value: '' | VehicleRegisterStatus; label: string }> = [
  { value: '', label: 'In use and awaiting approval' },
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending approval' },
  { value: 'expired', label: 'Expired' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'removed', label: 'Removed' },
];

interface VehicleRowProps {
  vehicle: Vehicle;
  additionalLabel: string;
  onEdit: () => void;
  onRemove: () => void;
}

function VehicleRow({ vehicle, additionalLabel, onEdit, onRemove }: VehicleRowProps): ReactNode {
  const status = vehicleStatus(vehicle);
  const open = status.label !== 'Removed' && status.label !== 'Rejected';
  return (
    <TableRow>
      <TableCell className="font-mono text-xs">{vehicle.registration_number}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          {slotTypeIcon(vehicle.vehicle_type)}
          <span>{typeLabel(vehicle.vehicle_type)}</span>
        </div>
      </TableCell>
      <TableCell>{[vehicle.make, vehicle.model].filter(Boolean).join(' ') || '-'}</TableCell>
      <TableCell>{vehicle.color ?? '-'}</TableCell>
      <TableCell>{vehicle.member_name ?? '-'}</TableCell>
      <TableCell>{vehicle.block ?? '-'}</TableCell>
      <TableCell>{vehicle.unit_number ?? '-'}</TableCell>
      <TableCell>{vehicle.slot_number ?? '-'}</TableCell>
      <TableCell className="font-mono text-xs">{vehicle.sticker_number ?? '-'}</TableCell>
      <TableCell className="font-mono text-xs">{vehicle.rfid_number ?? '-'}</TableCell>
      {additionalLabel && <TableCell>{vehicle.additional_field ?? '-'}</TableCell>}
      <TableCell className="whitespace-nowrap">{dayLabel(vehicle.valid_to)}</TableCell>
      <TableCell>
        <Badge variant={status.variant}>{status.label}</Badge>
      </TableCell>
      <TableCell className="whitespace-nowrap">
        {open && (
          <>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onEdit} aria-label={`Edit ${vehicle.registration_number}`}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onRemove} aria-label={`Remove ${vehicle.registration_number}`}>
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </>
        )}
      </TableCell>
    </TableRow>
  );
}

interface VehicleTableBodyProps {
  vehicles: Vehicle[];
  loading: boolean;
  additionalLabel: string;
  onEdit: (v: Vehicle) => void;
  onRemove: (v: Vehicle) => void;
}

function VehicleTableBody({ vehicles, loading, additionalLabel, onEdit, onRemove }: VehicleTableBodyProps): ReactNode {
  const COLUMN_COUNT = BASE_COLUMN_COUNT + (additionalLabel ? 1 : 0);
  if (loading) {
    return Array.from({ length: 5 }).map((_, i) => (
      <TableRow key={i}>
        {Array.from({ length: COLUMN_COUNT }).map((__, j) => (
          <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
        ))}
      </TableRow>
    ));
  }
  if (vehicles.length === 0) {
    return (
      <TableRow>
        <TableCell colSpan={COLUMN_COUNT} className="py-8 text-center text-muted-foreground">
          No vehicles found. Register vehicles to start tracking.
        </TableCell>
      </TableRow>
    );
  }
  return vehicles.map((vehicle) => (
    <VehicleRow key={vehicle.id} vehicle={vehicle} additionalLabel={additionalLabel} onEdit={() => onEdit(vehicle)} onRemove={() => onRemove(vehicle)} />
  ));
}

function VehicleFiltersBar({ filters, onChange }: { filters: VehicleFilters; onChange: (changes: VehicleFilters) => void }): ReactNode {
  const blocks = useBlocks().data ?? [];
  const [searchText, setSearchText] = useState(filters.search ?? '');
  function submitSearch(event: FormEvent): void {
    event.preventDefault();
    onChange({ search: searchText.trim() || undefined });
  }
  return (
    <div className="flex flex-wrap items-center gap-3">
      <form onSubmit={submitSearch} className="flex items-center gap-2" role="search">
        <Input aria-label="Search vehicles" placeholder="Vehicle no, name, unit, sticker" value={searchText} onChange={(e) => setSearchText(e.target.value)} className="w-60" />
        <Button type="submit" variant="outline" size="sm"><Search className="mr-1 h-4 w-4" />Search</Button>
      </form>
      <Select aria-label="Block" value={filters.block ?? ''} onChange={(e) => onChange({ block: e.target.value || undefined })}>
        <option value="">All Blocks</option>
        {blocks.map((block) => (
          <option key={block} value={block}>{block}</option>
        ))}
      </Select>
      <Select aria-label="Vehicle type" value={filters.vehicle_type ?? ''} onChange={(e) => onChange({ vehicle_type: e.target.value || undefined })}>
        <option value="">All Types</option>
        {VEHICLE_TYPES.map((t) => (
          <option key={t} value={t}>{typeLabel(t)}</option>
        ))}
      </Select>
      <Select aria-label="Status" value={filters.status ?? ''} onChange={(e) => onChange({ status: (e.target.value || undefined) as VehicleRegisterStatus | undefined })}>
        {STATUS_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </Select>
    </div>
  );
}

/**
 * Parking › Vehicles: the register, paged and filtered, pending vehicles
 * badged (PARK-02, PARK-03), RFID / extra field / To Date (PARK-08), and the
 * vehicle form as a dialog for Register and Edit (PARK-09).
 */
export function VehiclesTab(): ReactNode {
  const { addToast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const additionalLabel = useAdditionalFieldLabel();
  const [filters, setFilters] = useState<VehicleFilters>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PARKING_PAGE_SIZE);
  const removeMutation = useRemoveVehicle();
  const vehiclesQuery = useVehiclePage({ ...filters, page, limit: pageSize });
  const vehicles = vehiclesQuery.data?.data ?? [];

  function changeFilters(changes: VehicleFilters): void {
    setFilters((current) => ({ ...current, ...changes }));
    setPage(1);
  }

  function handleRemove(vehicle: Vehicle): void {
    if (!window.confirm(`Remove ${vehicle.registration_number} from the register?`)) return;
    removeMutation.mutate(vehicle.id, {
      onSuccess: () => addToast({ title: `Vehicle ${vehicle.registration_number} removed`, variant: 'success' }),
      onError: (error) => addToast({ title: 'Failed to remove vehicle', description: friendlyError(error), variant: 'destructive' }),
    });
  }

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Vehicles</CardTitle>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Register Vehicle
          </Button>
        </div>
        <VehicleFiltersBar filters={filters} onChange={changeFilters} />
        <ExportStrip
          config={{ path: '/parking/vehicles/export', params: vehicleFiltersToParams(filters) ?? {}, filename: 'vehicles' }}
          copyText={() => toTsv(VEHICLE_TEXT_COLUMNS, vehicles)}
          printPage={() => printableTable('Vehicles', VEHICLE_TEXT_COLUMNS, vehicles)}
          rowCount={vehicles.length}
        />
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Registration #</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Make / Model</TableHead>
              <TableHead>Color</TableHead>
              <TableHead>Member</TableHead>
              <TableHead>Block</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Parking Slot</TableHead>
              <TableHead>Sticker #</TableHead>
              <TableHead>RFID #</TableHead>
              {additionalLabel && <TableHead>{additionalLabel}</TableHead>}
              <TableHead>Valid Till</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <VehicleTableBody
              vehicles={vehicles}
              loading={vehiclesQuery.isLoading}
              additionalLabel={additionalLabel}
              onEdit={setEditing}
              onRemove={handleRemove}
            />
          </TableBody>
        </Table>
        <ListPager
          page={page}
          pageSize={pageSize}
          total={vehiclesQuery.data?.total}
          onPageChange={setPage}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
        />
      </CardContent>
      {createOpen && <VehicleForm mode="dialog" open onClose={() => setCreateOpen(false)} onSaved={() => setCreateOpen(false)} />}
      {editing && <VehicleForm key={editing.id} mode="dialog" open vehicle={editing} onClose={() => setEditing(null)} onSaved={() => setEditing(null)} />}
    </Card>
  );
}
