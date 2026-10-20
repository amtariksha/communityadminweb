'use client';

import { type ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Amenity } from '@/hooks';
import { SlotGrid } from './slot-grid';

/**
 * The parts of Edit Amenity saved on their own, below the form: the slots
 * of an amenity charged by the slot (AMEN-20).
 */
export function AmenityExtras({ amenity }: { amenity: Amenity }): ReactNode {
  if (amenity.pricing_type !== 'per_slot') return null;
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
