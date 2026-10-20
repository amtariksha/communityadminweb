'use client';

import { type ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Amenity } from '@/hooks';
import { AddonGrid } from './addon-grid';
import { SlotGrid } from './slot-grid';

/**
 * The parts of Edit Amenity saved on their own, below the form: the slots
 * of an amenity charged by the slot (AMEN-20) and the add-ons of a paid
 * amenity (AMEN-42).
 */
export function AmenityExtras({ amenity }: { amenity: Amenity }): ReactNode {
  return (
    <>
      {amenity.pricing_type === 'per_slot' && <SlotsCard amenity={amenity} />}
      {amenity.pricing_type !== 'free' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add-ons</CardTitle>
            <p className="text-sm text-muted-foreground">
              Sold with a booking, each as a line of its invoice on the amenity&apos;s income account.
            </p>
          </CardHeader>
          <CardContent>
            <AddonGrid amenityId={amenity.id} />
          </CardContent>
        </Card>
      )}
    </>
  );
}

function SlotsCard({ amenity }: { amenity: Amenity }): ReactNode {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Slots</CardTitle>
        <p className="text-sm text-muted-foreground">
          Up to 40 slots, each with its own name and cost; a slot without a cost charges the amenity&apos;s rate. Retire a slot
          instead of deleting it.
        </p>
      </CardHeader>
      <CardContent>
        <SlotGrid amenityId={amenity.id} />
      </CardContent>
    </Card>
  );
}
