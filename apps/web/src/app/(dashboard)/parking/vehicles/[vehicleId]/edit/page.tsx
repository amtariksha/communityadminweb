import { type ReactNode } from 'react';
import { EditVehiclePage } from '../../../components/vehicle-form-page';

// Parking Manager › Vehicles › Edit Vehicle (PARK-09, screen PARK-S5).
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ vehicleId: string }>;
  searchParams: Promise<{ plate?: string }>;
}): Promise<ReactNode> {
  const { vehicleId } = await params;
  const { plate } = await searchParams;
  return <EditVehiclePage vehicleId={vehicleId} plate={plate ?? ''} />;
}
