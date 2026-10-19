'use client';

import { type ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ParkingSetupForm } from '../parking/setup/parking-setup-form';

/** Settings › Parking (PARK-10): the same form as Parking Manager › Setup in classic. */
export function ParkingCard(): ReactNode {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Parking</CardTitle>
      </CardHeader>
      <CardContent>
        <ParkingSetupForm />
      </CardContent>
    </Card>
  );
}
