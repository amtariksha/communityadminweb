'use client';

import { useRouter } from 'next/navigation';
import { type ReactNode } from 'react';
import { AmenityForm } from '../components/amenity-form';

const SETUP = '/amenities/setup';

// Amenity & Event › Add Amenity (classic, AMEN-10, screen AMEN-S2 as a page).
export default function Page(): ReactNode {
  const router = useRouter();
  return <AmenityForm mode="page" onClose={() => router.push(SETUP)} onSaved={() => router.push(SETUP)} />;
}
