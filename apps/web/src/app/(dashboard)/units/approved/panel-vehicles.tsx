import { type ReactNode } from 'react';
import type { UnitPanelVehicle } from '@/hooks/use-unit-panel';
import { PanelSection } from './panel-section';
import { PanelTable, type PanelColumn } from './panel-table';

const STATUS_LABELS: Record<string, string> = { active: 'Active', pending: 'Pending approval' };

const COLUMNS: PanelColumn<UnitPanelVehicle>[] = [
  { header: 'Vehicle No', cell: (row) => row.registration_number },
  { header: 'Type', cell: (row) => row.vehicle_type.toUpperCase() === 'EV' ? 'EV' : row.vehicle_type.replace(/^./, (c) => c.toUpperCase()) },
  { header: 'Slot No', cell: (row) => row.slot_number ?? '—' },
  { header: 'Sticker No', cell: (row) => row.sticker_number ?? '—' },
  { header: 'Status', cell: (row) => STATUS_LABELS[row.status] ?? row.status },
];

export function PanelVehicles({ vehicles, count }: { vehicles: UnitPanelVehicle[]; count: number }): ReactNode {
  return (
    <PanelSection title="Vehicles" count={count}>
      <PanelTable label="Vehicles" columns={COLUMNS} rows={vehicles} rowKey={(row) => row.id} />
    </PanelSection>
  );
}
