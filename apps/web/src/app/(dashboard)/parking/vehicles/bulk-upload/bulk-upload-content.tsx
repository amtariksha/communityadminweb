'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { ImportFlow } from '@/components/import/import-flow';
import { ImportGrid } from '@/components/import/import-grid';
import { ImportLog } from '@/components/import/import-log';
import { Button } from '@/components/ui/button';
import { currentRole } from '@/lib/current-role';

const ENDPOINT = '/parking/imports';
const VEHICLE_COLUMNS = [
  { key: 'vehicle_number', label: 'Vehicle No' },
  { key: 'vehicle_type', label: 'Vehicle Type' },
  { key: 'block', label: 'Block' },
  { key: 'unit_number', label: 'Unit No' },
  { key: 'member_phone', label: 'Member Phone' },
  { key: 'slot_number', label: 'Slot No' },
  { key: 'sticker_number', label: 'Sticker No' },
  { key: 'valid_to', label: 'To Date' },
] as const;
const SLOT_COLUMNS = [
  { key: 'slot_number', label: 'Slot No' },
  { key: 'slot_type', label: 'Type' },
  { key: 'location', label: 'Location' },
  { key: 'has_ev_charger', label: 'EV charger (Y/N)' },
] as const;

// The roles the API admits: vehicles for approvers, slots for the community admin.
const VEHICLE_ROLES = new Set(['community_admin', 'committee_member', 'super_admin']);
const SLOT_ROLES = new Set(['community_admin', 'super_admin']);

function SlotsUpload({ allowed }: { allowed: boolean }): ReactNode {
  const [door, setDoor] = useState<'grid' | 'excel'>('grid');
  const target = { endpoint: ENDPOINT, type: 'parking_slots' };
  const description = 'Slot No, Type (Car, Bike, EV, Other), Location and EV charger (Y/N). A Slot No already used, or repeated, is refused; the others are added.';
  return (
    <div className="space-y-2">
      <div className="flex gap-2 text-sm">
        <Button type="button" size="sm" variant={door === 'grid' ? 'default' : 'ghost'} onClick={() => setDoor('grid')}>Type in a grid</Button>
        <Button type="button" size="sm" variant={door === 'excel' ? 'default' : 'ghost'} onClick={() => setDoor('excel')}>Upload Excel</Button>
      </div>
      {door === 'grid' ? (
        <ImportGrid target={target} title="Add slots in bulk" description={description} columns={SLOT_COLUMNS} applyLabel="Add" allowed={allowed} />
      ) : (
        <ImportFlow target={target} title="Add slots in bulk" description={description} columns={SLOT_COLUMNS} applyLabel="Add" allowed={allowed} />
      )}
    </div>
  );
}

/**
 * Parking Manager › Vehicles › Bulk Upload (PARK-11, screen PARK-S6): the
 * vehicles sheet (a registered Vehicle No is updated, a new one added
 * approved) and the slot bulk create, typed or uploaded.
 */
export function ParkingBulkUpload(): ReactNode {
  const router = useRouter();
  const role = currentRole() ?? '';
  const slotsFirst = useSearchParams()?.get('upload') === 'slots';
  const vehicles = (
    <ImportFlow
      target={{ endpoint: ENDPOINT, type: 'vehicles' }}
      title="Upload vehicles"
      description="One row per vehicle: Vehicle No, Block, Unit No and the rest of the register. A Vehicle No already registered is updated; a new one is added to the unit's member with that phone, else its primary contact, else its owner."
      columns={VEHICLE_COLUMNS}
      applyLabel="Save"
      allowed={VEHICLE_ROLES.has(role)}
    />
  );
  const slots = <SlotsUpload allowed={SLOT_ROLES.has(role)} />;
  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button type="button" variant="outline" onClick={() => router.push('/parking/vehicles')}>
          Close
        </Button>
      </div>
      {slotsFirst ? slots : vehicles}
      {slotsFirst ? vehicles : slots}
      <ImportLog endpoint={ENDPOINT} labels={{ vehicles: 'Vehicles', parking_slots: 'Parking slots' }} />
    </div>
  );
}
