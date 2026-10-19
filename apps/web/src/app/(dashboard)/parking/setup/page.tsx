import { type ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ParkingSetupForm } from './parking-setup-form';

// Parking Manager › Setup (PARK-10, screen PARK-S1).
export default function Page(): ReactNode {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Parking Setup</CardTitle>
      </CardHeader>
      <CardContent>
        <ParkingSetupForm />
      </CardContent>
    </Card>
  );
}
