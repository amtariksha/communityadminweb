'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { unitPanelKeys, type UnitPanelVehicle } from '@/hooks/use-unit-panel';
import { VehicleForm } from '../../parking/components/vehicle-form';
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

/** Vehicles, with + Add Vehicle (PARK-09's form; an admin's vehicle is approved on save, PARK-03). */
export function PanelVehicles({ vehicles, count, unitId }: { vehicles: UnitPanelVehicle[]; count: number; unitId: string }): ReactNode {
  const [adding, setAdding] = useState(false);
  const queryClient = useQueryClient();
  return (
    <>
      <PanelSection
        title="Vehicles"
        count={count}
        actions={
          <Button type="button" variant="outline" size="sm" onClick={() => setAdding(true)}>
            + Add Vehicle
          </Button>
        }
      >
        <PanelTable label="Vehicles" columns={COLUMNS} rows={vehicles} rowKey={(row) => row.id} />
      </PanelSection>
      {adding && (
        <VehicleForm
          mode="dialog"
          open
          unitId={unitId}
          onClose={() => setAdding(false)}
          onSaved={() => {
            setAdding(false);
            void queryClient.invalidateQueries({ queryKey: unitPanelKeys.panel(unitId) });
          }}
        />
      )}
    </>
  );
}
