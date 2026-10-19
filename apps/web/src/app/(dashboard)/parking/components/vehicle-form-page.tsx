'use client';

import { useRouter } from 'next/navigation';
import { type ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useVehiclePage } from '@/hooks/use-parking';
import { VehicleForm } from './vehicle-form';

const VEHICLES = '/parking/vehicles';

/** The Edit link of a register row; the plate lets the page find the row (there is no GET by id). */
export const editVehicleHref = (vehicle: { id: string; registration_number: string }): string =>
  `${VEHICLES}/${vehicle.id}/edit?plate=${encodeURIComponent(vehicle.registration_number)}`;

/** Parking Manager › Vehicles › Add Vehicle as a page (PARK-09). */
export function AddVehiclePage(): ReactNode {
  const router = useRouter();
  const back = () => router.push(VEHICLES);
  return <VehicleForm mode="page" onClose={back} onSaved={back} />;
}

/** Parking Manager › Vehicles › Edit Vehicle as a page; the row is found by its plate in the register. */
export function EditVehiclePage({ vehicleId, plate }: { vehicleId: string; plate: string }): ReactNode {
  const router = useRouter();
  const back = () => router.push(VEHICLES);
  const found = useVehiclePage({ search: plate || undefined, limit: 100 }, { enabled: plate !== '' });
  if (plate && found.isLoading) return <Skeleton className="h-64 w-full" />;
  const vehicle = found.data?.data.find((candidate) => candidate.id === vehicleId);
  if (!vehicle) return <p className="text-sm text-muted-foreground">This vehicle could not be found. Open it from the vehicle register.</p>;
  return <VehicleForm key={vehicle.id} mode="page" vehicle={vehicle} onClose={back} onSaved={back} />;
}
