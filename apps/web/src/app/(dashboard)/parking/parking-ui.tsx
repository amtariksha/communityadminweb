import { type ReactNode } from 'react';
import { Bike, Car, ParkingSquare } from 'lucide-react';
import { DataTablePager } from '@/components/data-table/data-table-pager';
import type { TextColumn } from '@/components/data-table/table-text';
import type { ParkingSlot, Vehicle, VehicleRegisterStatus } from '@/hooks/use-parking';

/** Shared pieces of the Slots and Vehicles tabs (PARK-02 … PARK-05). */

// The parking_slots CHECK (migration 164) and the API accept these.
export const SLOT_TYPES = ['car', 'bike', 'ev', 'other'] as const;
// registerVehicleSchema accepts these.
export const VEHICLE_TYPES = ['car', 'bike', 'scooter', 'ev', 'other'] as const;

export const PARKING_PAGE_SIZE = 50;
export const PARKING_PAGE_SIZES = [25, 50, 100] as const;

export function typeLabel(type: string | null | undefined): string {
  if (!type) return '-';
  return type === 'ev' ? 'EV' : type.charAt(0).toUpperCase() + type.slice(1);
}

export function slotTypeIcon(type: string): ReactNode {
  switch (type) {
    case 'car':
      return <Car className="h-4 w-4 text-blue-500" />;
    case 'bike':
    case 'scooter':
      return <Bike className="h-4 w-4 text-green-500" />;
    default:
      return <ParkingSquare className="h-4 w-4 text-muted-foreground" />;
  }
}

export function slotStatusVariant(status: string): 'secondary' | 'success' | 'warning' {
  if (status === 'assigned') return 'success';
  if (status === 'sublet') return 'warning';
  return 'secondary';
}

const REGISTER_STATUS: Record<VehicleRegisterStatus, { label: string; variant: 'success' | 'warning' | 'secondary' | 'destructive' }> = {
  active: { label: 'Active', variant: 'success' },
  pending: { label: 'Pending', variant: 'warning' },
  expired: { label: 'Expired', variant: 'secondary' },
  rejected: { label: 'Rejected', variant: 'destructive' },
  removed: { label: 'Removed', variant: 'secondary' },
};

/** The register status of a row; an older API sends only approval_status / is_active. */
export function vehicleStatus(vehicle: Vehicle): { label: string; variant: 'success' | 'warning' | 'secondary' | 'destructive' } {
  if (vehicle.register_status) return REGISTER_STATUS[vehicle.register_status];
  if (vehicle.approval_status === 'pending') return REGISTER_STATUS.pending;
  if (vehicle.approval_status === 'rejected') return REGISTER_STATUS.rejected;
  return vehicle.is_active ? REGISTER_STATUS.active : REGISTER_STATUS.removed;
}

/** Copy / Print columns of the visible slot page (the file exports come from the API). */
export const SLOT_TEXT_COLUMNS: readonly TextColumn<ParkingSlot>[] = [
  { header: 'Slot #', text: (slot) => slot.slot_number },
  { header: 'Type', text: (slot) => typeLabel(slot.slot_type) },
  { header: 'Location', text: (slot) => slot.location ?? '' },
  { header: 'Status', text: (slot) => typeLabel(slot.status) },
  { header: 'Unit', text: (slot) => slot.unit_number ?? '' },
  { header: 'Member', text: (slot) => slot.member_name ?? '' },
];

export const VEHICLE_TEXT_COLUMNS: readonly TextColumn<Vehicle>[] = [
  { header: 'Vehicle No', text: (v) => v.registration_number },
  { header: 'Type', text: (v) => typeLabel(v.vehicle_type) },
  { header: 'Block', text: (v) => v.block ?? '' },
  { header: 'Unit', text: (v) => v.unit_number ?? '' },
  { header: 'Name', text: (v) => v.member_name ?? '' },
  { header: 'Slot', text: (v) => v.slot_number ?? '' },
  { header: 'Sticker No', text: (v) => v.sticker_number ?? '' },
  { header: 'Status', text: (v) => vehicleStatus(v).label },
];

interface ListPagerProps {
  page: number;
  pageSize: number;
  total: number | undefined;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

/** "Showing x to y of z entries" with page size and Previous / Next. */
export function ListPager({ page, pageSize, total, onPageChange, onPageSizeChange }: ListPagerProps): ReactNode {
  if (!total) return null;
  return (
    <div className="mt-4">
      <DataTablePager
        page={page}
        pageSize={pageSize}
        total={total}
        pageSizeOptions={PARKING_PAGE_SIZES}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </div>
  );
}
