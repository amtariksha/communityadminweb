'use client';

import Link from 'next/link';
import { useCallback, useState, type ReactNode } from 'react';
import { Plus } from 'lucide-react';
import { UnitBlockLinks } from '@/components/block-links';
import { CountedSelect, DataTable, type DataTableColumn } from '@/components/data-table';
import { buttonVariants } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import {
  useRemoveVehicle,
  useVehiclePage,
  vehicleFiltersToParams,
  type Vehicle,
  type VehicleFilters,
  type VehicleRegisterStatus,
} from '@/hooks/use-parking';
import { friendlyError } from '@/lib/api-error';
import { useAdditionalFieldLabel } from '@/hooks/use-parking-settings';
import { editVehicleHref } from '../components/vehicle-form-page';
import { PARKING_PAGE_SIZES, typeLabel, vehicleStatus } from '../parking-ui';

const STATUS_OPTIONS: ReadonlyArray<{ value: VehicleRegisterStatus; label: string }> = [
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'expired', label: 'Expired' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'removed', label: 'Removed' },
];

/** `2026-06-30` → `30/06/2026`. */
export const dayLabel = (value: string | null | undefined): string => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '');
  return match ? `${match[3]}/${match[2]}/${match[1]}` : '—';
};

/**
 * PARK-S4's register (PARK-08). The Additional Field column carries the
 * Parking Setup label and is left out while the label is blank.
 */
export function vehicleColumns(additionalLabel: string): DataTableColumn<Vehicle>[] {
  const extra: DataTableColumn<Vehicle>[] = additionalLabel
    ? [{ key: 'additional', header: additionalLabel, cell: (row) => row.additional_field ?? '—' }]
    : [];
  return [
    { key: 'slot', header: 'Slot No', cell: (row) => row.slot_number ?? '—' },
    { key: 'slot-type', header: 'Slot Type', cell: (row) => (row.slot_type ? typeLabel(row.slot_type) : '—') },
    { key: 'block', header: 'Block', cell: (row) => row.block ?? '—' },
    { key: 'unit', header: 'Unit No', cell: (row) => row.unit_number ?? '—', className: 'whitespace-nowrap' },
    { key: 'status', header: 'Status', cell: (row) => vehicleStatus(row).label },
    { key: 'name', header: 'Name', cell: (row) => row.member_name ?? '—' },
    { key: 'vehicle', header: 'Vehicle No', cell: (row) => row.registration_number, className: 'font-mono text-xs' },
    { key: 'type', header: 'Vehicle Type', cell: (row) => typeLabel(row.vehicle_type) },
    { key: 'sticker', header: 'Sticker No', cell: (row) => row.sticker_number ?? '—' },
    { key: 'rfid', header: 'RFID No', cell: (row) => row.rfid_number ?? '—' },
    ...extra,
    { key: 'from', header: 'From Date', cell: (row) => dayLabel(row.valid_from), className: 'whitespace-nowrap' },
    { key: 'to', header: 'To Date', cell: (row) => dayLabel(row.valid_to), className: 'whitespace-nowrap' },
    { key: 'comments', header: 'Comments', cell: (row) => row.comments ?? '—' },
  ];
}

const removable = (vehicle: Vehicle): boolean => !['Removed', 'Rejected'].includes(vehicleStatus(vehicle).label);

/**
 * Parking Manager › Vehicles › All Vehicles (PARK-06, PARK-08, screen
 * PARK-S4): one wide register with block links (SB-10), a server search, a
 * status filter (in use, expired and awaiting approval by default), the
 * export strip, Add Vehicle and Edit as pages (PARK-09) and Remove.
 * Approvals are the Awaiting Approval sub-tab (PARK-D5).
 */
export function VehiclesRegister(): ReactNode {
  const { addToast } = useToast();
  const [filters, setFilters] = useState<VehicleFilters>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PARKING_PAGE_SIZES[0]);
  const additionalLabel = useAdditionalFieldLabel();
  const removeMutation = useRemoveVehicle();
  const query = useVehiclePage({ ...filters, page, limit: pageSize });
  const change = useCallback((changes: VehicleFilters) => {
    setFilters((current) => ({ ...current, ...changes }));
    setPage(1);
  }, []);
  const onSearch = useCallback((value: string) => change({ search: value || undefined }), [change]);

  function remove(vehicle: Vehicle): void {
    if (!window.confirm(`Remove ${vehicle.registration_number} from the register?`)) return;
    removeMutation.mutate(vehicle.id, {
      onSuccess: () => addToast({ title: `Vehicle ${vehicle.registration_number} removed`, variant: 'success' }),
      onError: (error) => addToast({ title: 'Failed to remove vehicle', description: friendlyError(error), variant: 'destructive' }),
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <UnitBlockLinks value={filters.block ?? null} onChange={(block) => change({ block: block ?? undefined })} />
        <Link href="/parking/vehicles/new" className={buttonVariants()}>
          <Plus className="mr-2 h-4 w-4" /> Add Vehicle
        </Link>
      </div>
      <DataTable<Vehicle>
        title="Vehicles"
        serialHeader="Sr No"
        columns={vehicleColumns(additionalLabel)}
        actions={[
          { key: 'edit', header: 'Action', label: 'Edit', href: editVehicleHref, hidden: (row) => !removable(row) },
          { key: 'remove', header: '', label: 'Remove', onClick: remove, hidden: (row) => !removable(row) },
        ]}
        rows={query.data?.data ?? []}
        rowKey={(row) => row.id}
        total={query.data?.total ?? 0}
        page={page}
        pageSize={pageSize}
        pageSizeOptions={PARKING_PAGE_SIZES}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
        search={{ value: filters.search ?? '', onChange: onSearch, placeholder: 'Vehicle no, name, unit, sticker or RFID' }}
        filters={
          <CountedSelect
            id="vehicle-status"
            label="Status"
            value={filters.status ?? ''}
            allLabel="In use, expired and awaiting approval"
            options={STATUS_OPTIONS}
            onChange={(value) => change({ status: (value || undefined) as VehicleRegisterStatus | undefined })}
          />
        }
        export={{ path: '/parking/vehicles/export', params: vehicleFiltersToParams(filters) ?? {}, filename: 'vehicles' }}
        loading={query.isLoading}
        error={query.isError ? query.error : undefined}
        onRetry={() => void query.refetch()}
        emptyText="Showing 0 to 0 of 0 entries."
      />
    </div>
  );
}
