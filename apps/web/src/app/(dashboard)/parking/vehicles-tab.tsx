'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { Plus, Search, Trash2 } from 'lucide-react';
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
import { RegisterVehicleDialog } from './register-vehicle-dialog';
import {
  ListPager,
  PARKING_PAGE_SIZE,
  VEHICLE_TEXT_COLUMNS,
  VEHICLE_TYPES,
  slotTypeIcon,
  typeLabel,
  vehicleStatus,
} from './parking-ui';

const COLUMN_COUNT = 11;

// The register's own list; "In use and awaiting approval" is the API default.
const STATUS_OPTIONS: ReadonlyArray<{ value: '' | VehicleRegisterStatus; label: string }> = [
  { value: '', label: 'In use and awaiting approval' },
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending approval' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'removed', label: 'Removed' },
];

function VehicleRow({ vehicle, onRemove }: { vehicle: Vehicle; onRemove: () => void }): ReactNode {
  const status = vehicleStatus(vehicle);
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
      <TableCell>
        <Badge variant={status.variant}>{status.label}</Badge>
      </TableCell>
      <TableCell>
        {status.label !== 'Removed' && status.label !== 'Rejected' && (
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onRemove} title="Remove vehicle">
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}

function VehicleTableBody({ vehicles, loading, onRemove }: { vehicles: Vehicle[]; loading: boolean; onRemove: (v: Vehicle) => void }): ReactNode {
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
  return vehicles.map((vehicle) => <VehicleRow key={vehicle.id} vehicle={vehicle} onRemove={() => onRemove(vehicle)} />);
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

/** Parking › Vehicles: the register, paged and filtered, pending vehicles badged (PARK-02, PARK-03). */
export function VehiclesTab(): ReactNode {
  const { addToast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
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
              <TableHead>Status</TableHead>
              <TableHead className="w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <VehicleTableBody vehicles={vehicles} loading={vehiclesQuery.isLoading} onRemove={handleRemove} />
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
      <RegisterVehicleDialog open={createOpen} onOpenChange={setCreateOpen} />
    </Card>
  );
}
