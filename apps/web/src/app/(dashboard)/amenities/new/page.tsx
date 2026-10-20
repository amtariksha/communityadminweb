'use client';

import { useRouter } from 'next/navigation';
import { type ReactNode } from 'react';
import { AmenityForm } from '../components/amenity-form';

const SETUP = '/amenities/setup';

// Amenity & Event › Add Amenity (classic, AMEN-10, screen AMEN-S2 as a page).
// AMEN-20: an amenity charged by the slot goes on to its edit page, where its slots are set.
export default function Page(): ReactNode {
  const router = useRouter();
  return (
    <AmenityForm
      mode="page"
      onClose={() => router.push(SETUP)}
      onSaved={(amenity) => router.push(amenity?.pricing_type === 'per_slot' ? `/amenities/${amenity.id}/edit` : SETUP)}
    />
  );
}
